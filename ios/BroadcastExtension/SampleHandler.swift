import ReplayKit
import WebRTC

/// The broadcast extension: ReplayKit frames in, WebRTC out.
///
/// Everything happens in this process. The container app is not running by the
/// time iOS starts a broadcast, so it cannot hold the peer connection or relay
/// frames — the extension owns the whole connection for its lifetime.
///
/// ## The memory budget is the design constraint
///
/// A broadcast upload extension is hard-killed at roughly 50 MB, and the frames
/// arrive at full device resolution. Two rules keep this comfortable:
///
/// 1. **Never touch a pixel buffer.** ReplayKit hands over NV12, which is
///    exactly what the encoder wants. It goes to `RTCVideoSource` as-is: no
///    CIImage, no vImage, no colour conversion, no copies.
/// 2. **Let WebRTC own the encoder.** libwebrtc uses VideoToolbox hardware
///    H.264 internally. Running a second `VTCompressionSession` alongside it
///    would double the pools for no gain.
///
/// Downscaling is requested through `adaptOutputFormat` rather than done by
/// hand, so it happens inside the encoder pipeline instead of costing a buffer
/// of our own.
class SampleHandler: RPBroadcastSampleHandler {
    private var factory: RTCPeerConnectionFactory?
    private var peerConnection: RTCPeerConnection?
    private var videoSource: RTCVideoSource?
    private var capturer: RTCVideoCapturer?
    private var sender: RTCRtpSender?
    private var signal: SignalClient?
    private var motion: MotionSender?

    /// Candidates that arrive before the offer has been applied.
    ///
    /// `add(candidate:)` is rejected while the remote description is unset, and
    /// the studio starts trickling immediately. Dropping them instead of
    /// holding them is the classic cause of a session that reaches
    /// "connecting" and stalls there forever.
    private var pendingCandidates: [RTCIceCandidate] = []

    /// The phone's screen is far larger than the mockup ever resolves, and
    /// every extra pixel is encoder memory inside a 50 MB budget. Expressed as
    /// a cap on the LONG side rather than a width and a height — see
    /// `adaptOutput(to:)` for why that distinction is not cosmetic.
    /// High enough to be a no-op on every current iPhone — a 17 Pro is
    /// 1206x2622, a Pro Max 1320x2868 — so the screen is sent at native
    /// resolution and nothing is thrown away before the browser sees it.
    ///
    /// Not unbounded, because this is the one setting that can walk the
    /// extension into its memory limit. `memoryGuard()` steps it back down if
    /// that starts to happen, and this is the ceiling it steps down from.
    private var maxLongSide: CGFloat = 2880
    private let targetFps: Int32 = 30

    /// Resolution steps, in descending order, for the memory guard to fall
    /// back through. Each is a real drop rather than a nudge: shaving 5% off
    /// does not recover a process that is already close to the limit.
    private let fallbackLongSides: [CGFloat] = [2880, 2160, 1920, 1440]
    private var fallbackIndex = 0

    /// iOS hard-kills a broadcast upload extension at roughly 50 MB. Stepping
    /// down at 38 leaves room for the spike that a re-configure itself causes,
    /// which is the moment a naive guard would be killed by its own fix.
    private let memoryCeilingMB: Double = 38
    private var framesSinceMemoryCheck = 0

    /// Generous, because the constraint here is not the network.
    ///
    /// Both ends are on one LAN, so there is no upstream to protect — the only
    /// budget that matters is the extension's 50 MB, and bitrate does not
    /// spend it (the encoder's pools are sized by resolution). Left at
    /// libwebrtc's default the stream starts a few hundred kbps and ramps
    /// slowly, which on a screen full of small text and icons reads as
    /// permanent softness rather than as a brief warm-up.
    private let maxBitrate = 12_000_000
    private let startBitrate = 6_000_000

    /// The frame size the adapter is currently configured for. Recomputed only
    /// when it changes, which is a device rotation and nothing else.
    private var adaptedFor: CGSize = .zero

    override func broadcastStarted(withSetupInfo setupInfo: [String: NSObject]?) {
        // Two different failures, two different messages. They were one
        // message once, and it sent someone to re-scan a code four times over
        // a problem that was in the entitlements and could never have been
        // fixed by scanning.
        guard BroadcastStore.isAvailable else {
            finish("This build cannot open its shared App Group, so it cannot read the pairing. The app and the extension need the same App Group in both entitlement files. Re-scanning will not help.")
            return
        }
        guard let config = BroadcastStore.load() else {
            finish("No studio is paired. Open Mockup Studio on your phone and scan the code again.")
            return
        }

        RTCInitializeSSL()

        let encoder = RTCDefaultVideoEncoderFactory()
        let decoder = RTCDefaultVideoDecoderFactory()
        let factory = RTCPeerConnectionFactory(encoderFactory: encoder, decoderFactory: decoder)
        self.factory = factory

        /// No ICE servers, matching the browser.
        ///
        /// STUN discovers a public address, which is meaningless when both ends
        /// are on one Wi-Fi — host candidates complete the connection on their
        /// own. An empty list is what makes "no internet dependency" true.
        let rtcConfig = RTCConfiguration()
        rtcConfig.iceServers = []
        rtcConfig.sdpSemantics = .unifiedPlan
        // Frames are already H.264 from a hardware encoder; a relay would only
        // add a hop we have deliberately refused to build.
        rtcConfig.continualGatheringPolicy = .gatherContinually

        let constraints = RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: nil)
        guard let peerConnection = factory.peerConnection(
            with: rtcConfig, constraints: constraints, delegate: self
        ) else {
            finish("Could not start the video connection.")
            return
        }
        self.peerConnection = peerConnection

        /// `forScreenCast: true` is not a hint, it selects a different encoder
        /// configuration. Camera video assumes a moving subject where softness
        /// is masked by motion, and it will trade resolution away freely to
        /// hold framerate. A phone screen is the opposite case: mostly static,
        /// full of small text and hard edges, and unreadable the moment it is
        /// scaled down. This is what stops that trade being made.
        let source = factory.videoSource(forScreenCast: true)
        // Deliberately NOT adapted here: the frame size is not known until the
        // first sample arrives, and guessing it crops the screen. See
        // `adaptOutput(to:)`.
        let track = factory.videoTrack(with: source, trackId: "screen0")
        sender = peerConnection.add(track, streamIds: ["mockup-studio"])
        videoSource = source
        capturer = RTCVideoCapturer(delegate: source)

        // Started alongside the video, not on connection: motion is useful the
        // moment the broadcast begins, and it travels over the studio's
        // existing /api/gyro transport rather than the peer connection.
        let motion = MotionSender(config: config)
        motion.start()
        self.motion = motion

        let signal = SignalClient(config: config)
        signal.onMessage = { [weak self] message in self?.receive(message) }
        signal.onError = { [weak self] reason in self?.finish(reason) }
        signal.connect()
        self.signal = signal
    }

    override func processSampleBuffer(
        _ sampleBuffer: CMSampleBuffer,
        with sampleBufferType: RPSampleBufferType
    ) {
        // Audio is captured but deliberately dropped: the studio renders a
        // silent mockup, and an unused audio track costs budget in a process
        // that has none to spare.
        guard sampleBufferType == .video,
              let source = videoSource,
              let capturer = capturer,
              let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer)
        else { return }

        memoryGuard()
        adaptOutput(to: CGSize(
            width: CVPixelBufferGetWidth(pixelBuffer),
            height: CVPixelBufferGetHeight(pixelBuffer)
        ))

        // Straight through. The RTCCVPixelBuffer wrapper retains rather than
        // copies, so no frame-sized allocation happens here.
        let buffer = RTCCVPixelBuffer(pixelBuffer: pixelBuffer)
        let timestampNs = Int64(
            CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sampleBuffer)) * 1_000_000_000
        )
        let frame = RTCVideoFrame(buffer: buffer, rotation: rotation(of: sampleBuffer), timeStampNs: timestampNs)
        source.capturer(capturer, didCapture: frame)
    }

    /// Cap the resolution WITHOUT changing the shape of the screen.
    ///
    /// `adaptOutputFormat(toWidth:height:fps:)` reads as "scale to fit inside
    /// this box". It is not: libwebrtc's adapter first CROPS the source to the
    /// aspect ratio of the size it is given, then scales. Passing a fixed
    /// 1080x1920 therefore forces every capture to 9:16 — and a modern iPhone
    /// screen is nowhere near 9:16, so the bottom of the display (the dock,
    /// most visibly) was being cut off inside the encoder, before the browser
    /// ever saw a frame. No amount of fitting at the far end can recover it.
    ///
    /// So the cap is applied to the long side and the other dimension is
    /// derived from the frame actually in hand, which keeps the requested
    /// aspect identical to the source and makes the crop a no-op.
    private func adaptOutput(to size: CGSize) {
        guard size != adaptedFor, size.width > 0, size.height > 0 else { return }
        adaptedFor = size

        let scale = min(1, maxLongSide / max(size.width, size.height))
        // Even dimensions: H.264 chroma is subsampled 2x2, and an odd width or
        // height is rounded by the encoder — which reintroduces exactly the
        // sub-pixel aspect drift this method exists to avoid.
        let width = Int32((size.width * scale).rounded(.down)) & ~1
        let height = Int32((size.height * scale).rounded(.down)) & ~1
        videoSource?.adaptOutputFormat(toWidth: width, height: height, fps: targetFps)
    }

    /// Step the resolution down before iOS steps in.
    ///
    /// Raising the cap to native is what makes the mockup sharp, and it is also
    /// the only change here that can reach the extension's memory limit — where
    /// the failure is not degraded video but the broadcast being terminated
    /// outright, mid-session, with no warning. Watching the real footprint and
    /// giving up resolution voluntarily is the difference between a picture
    /// that softens under pressure and one that disappears.
    ///
    /// Sampled every 30 frames: `task_info` is a syscall, and per-frame it
    /// would be a cost paid 30 times a second to answer a question that
    /// changes over seconds.
    private func memoryGuard() {
        framesSinceMemoryCheck += 1
        guard framesSinceMemoryCheck >= 30 else { return }
        framesSinceMemoryCheck = 0

        guard memoryFootprintMB() > memoryCeilingMB else { return }
        guard fallbackIndex + 1 < fallbackLongSides.count else { return }

        fallbackIndex += 1
        maxLongSide = fallbackLongSides[fallbackIndex]
        // Force the next frame to re-run the adapter against the new cap.
        adaptedFor = .zero
    }

    /// `phys_footprint` rather than resident size: it is the number the
    /// jetsam limit is actually measured against, and the two diverge enough
    /// under video encoding to make resident size misleading.
    private func memoryFootprintMB() -> Double {
        var info = task_vm_info_data_t()
        var count = mach_msg_type_number_t(
            MemoryLayout<task_vm_info_data_t>.size / MemoryLayout<natural_t>.size
        )
        let result = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
                task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count)
            }
        }
        guard result == KERN_SUCCESS else { return 0 }
        return Double(info.phys_footprint) / 1_048_576
    }

    /// ReplayKit tags each frame with the device orientation rather than
    /// rotating the buffer. Passing it through means a phone turned mid-session
    /// re-orients on the mockup instead of arriving sideways.
    private func rotation(of sampleBuffer: CMSampleBuffer) -> RTCVideoRotation {
        guard let raw = CMGetAttachment(
            sampleBuffer, key: RPVideoSampleOrientationKey as CFString, attachmentModeOut: nil
        ) as? NSNumber, let orientation = CGImagePropertyOrientation(rawValue: raw.uint32Value) else {
            return ._0
        }
        switch orientation {
        case .left, .leftMirrored: return ._90
        case .down, .downMirrored: return ._180
        case .right, .rightMirrored: return ._270
        default: return ._0
        }
    }

    override func broadcastFinished() {
        signal?.send(.bye(reason: "broadcast ended"))
        teardown()
    }

    private func teardown() {
        motion?.stop()
        motion = nil
        signal?.stop()
        signal = nil
        peerConnection?.close()
        peerConnection = nil
        sender = nil
        videoSource = nil
        capturer = nil
        factory = nil
        RTCCleanupSSL()
    }

    /// Ends the broadcast with a message the user actually sees, in the system
    /// broadcast UI. Failing silently here looks like the feature is broken.
    private func finish(_ reason: String) {
        teardown()
        finishBroadcastWithError(NSError(
            domain: "com.mockup.studio.broadcast",
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: reason]
        ))
    }

    // MARK: - Negotiation

    private func receive(_ message: SignalClient.Message) {
        guard let peerConnection else { return }

        switch message {
        case .offer(let sdp):
            let description = RTCSessionDescription(type: .offer, sdp: sdp)
            peerConnection.setRemoteDescription(description) { [weak self] error in
                guard let self else { return }
                if let error {
                    self.finish("The studio's offer was rejected: \(error.localizedDescription)")
                    return
                }
                self.drainPendingCandidates()
                self.answer()
            }

        case .candidate(let sdp, let mid, let index):
            let candidate = RTCIceCandidate(sdp: sdp, sdpMLineIndex: index, sdpMid: mid)
            if peerConnection.remoteDescription == nil {
                pendingCandidates.append(candidate)
            } else {
                peerConnection.add(candidate) { _ in }
            }

        case .bye(let reason):
            finish("The studio ended the session (\(reason)).")

        case .answer:
            // The phone always answers; an answer arriving here is the studio
            // misconfigured, not a state to act on.
            break
        }
    }

    /// Raise the ceiling and stop the encoder trading resolution for framerate.
    ///
    /// `maintainResolution` is the half that matters. Without it libwebrtc
    /// responds to any CPU or bandwidth pressure by scaling the picture down,
    /// and a screen share degrades into something you cannot read long before
    /// the framerate would have suffered enough to notice.
    private func applyEncoding() {
        guard let sender else { return }
        let parameters = sender.parameters
        parameters.degradationPreference = NSNumber(
            value: RTCDegradationPreference.maintainResolution.rawValue
        )
        for encoding in parameters.encodings {
            encoding.isActive = true
            encoding.maxBitrateBps = NSNumber(value: maxBitrate)
            encoding.minBitrateBps = NSNumber(value: startBitrate)
            encoding.maxFramerate = NSNumber(value: targetFps)
            // Any value above 1 here silently halves the picture; it is the
            // other place resolution quietly disappears.
            encoding.scaleResolutionDownBy = NSNumber(value: 1.0)
        }
        sender.parameters = parameters
    }

    private func drainPendingCandidates() {
        guard let peerConnection else { return }
        for candidate in pendingCandidates {
            peerConnection.add(candidate) { _ in }
        }
        pendingCandidates.removeAll()
    }

    private func answer() {
        guard let peerConnection else { return }
        let constraints = RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: nil)
        peerConnection.answer(for: constraints) { [weak self] description, error in
            guard let self, let description else {
                self?.finish("Could not answer the studio: \(error?.localizedDescription ?? "unknown")")
                return
            }
            peerConnection.setLocalDescription(description) { _ in
                self.signal?.send(.answer(sdp: description.sdp))
                // After the answer, not before: negotiation replaces the
                // sender's encodings, so anything set earlier is discarded.
                self.applyEncoding()
            }
        }
    }
}

extension SampleHandler: RTCPeerConnectionDelegate {
    func peerConnection(_ pc: RTCPeerConnection, didGenerate candidate: RTCIceCandidate) {
        signal?.send(.candidate(
            sdp: candidate.sdp,
            mid: candidate.sdpMid,
            index: candidate.sdpMLineIndex
        ))
    }

    func peerConnection(_ pc: RTCPeerConnection, didChange state: RTCIceConnectionState) {
        if state == .failed {
            finish("Could not reach the Mac. Both devices must be on the same Wi-Fi, and the network must allow direct connections.")
        }
    }

    // Unified Plan gives us these; none affect a send-only screen share.
    func peerConnection(_ pc: RTCPeerConnection, didChange stateChanged: RTCSignalingState) {}
    func peerConnection(_ pc: RTCPeerConnection, didAdd stream: RTCMediaStream) {}
    func peerConnection(_ pc: RTCPeerConnection, didRemove stream: RTCMediaStream) {}
    func peerConnectionShouldNegotiate(_ pc: RTCPeerConnection) {}
    func peerConnection(_ pc: RTCPeerConnection, didChange newState: RTCIceGatheringState) {}
    func peerConnection(_ pc: RTCPeerConnection, didRemove candidates: [RTCIceCandidate]) {}
    func peerConnection(_ pc: RTCPeerConnection, didOpen dataChannel: RTCDataChannel) {}
}
