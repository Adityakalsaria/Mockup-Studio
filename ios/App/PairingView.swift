import AVFoundation
import ReplayKit
import SwiftUI

/// The whole container app: scan a code, then start a broadcast.
///
/// It does not stream anything itself. Its only jobs are to put the scanned
/// address somewhere the extension can read it, and to present the system
/// broadcast picker — after that iOS runs the extension and this app can be
/// suspended or killed without affecting the session.
struct PairingView: View {
    /// Set when the join page deep-links in, so a handoff from Safari lands on
    /// the paired screen rather than the scanner.
    @Binding var incoming: BroadcastConfig?
    @State private var config: BroadcastConfig?
    @State private var error: String?

    var body: some View {
        VStack(spacing: 24) {
            // Bound to a new name rather than shadowing `config`: the
            // "scan again" button below has to clear the state property, and
            // a shadow makes that assignment target the immutable copy.
            if let paired = config {
                VStack(spacing: 6) {
                    Text("Connected to your Mac").font(.headline)
                    Text("\(paired.host):\(String(paired.port))")
                        .font(.system(.footnote, design: .monospaced))
                        .foregroundStyle(.secondary)
                }

                /// A real-looking button with the system picker laid over it.
                ///
                /// `RPSystemBroadcastPickerView` is the only way to start a
                /// broadcast and it renders as a small unlabelled glyph that
                /// users do not find. It cannot be restyled through any public
                /// API, so the readable button is drawn underneath and the
                /// picker sits on top, transparent, catching the tap.
                ZStack {
                    Text("Start Broadcasting")
                        .font(.headline)
                        .foregroundStyle(Color.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.white, in: Capsule())
                    BroadcastPickerView()
                }
                .frame(height: 54)
                .padding(.horizontal, 24)

                VStack(spacing: 4) {
                    Text("iOS will ask which app to broadcast with.")
                    Text("Choose **Mockup Studio**, then tap **Start Broadcast**.")
                }
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

                Button("Scan a different code") {
                    config = nil
                    incoming = nil
                }
                    .font(.footnote)
                    .padding(.top, 8)
            } else {
                QRScannerView { scanned in
                    guard let parsed = BroadcastConfig.parse(scanned) else {
                        error = "That code is not a Mockup Studio pairing code."
                        return
                    }
                    // Persisted before the picker is ever shown: the extension
                    // reads this at launch, and the app may not be alive then.
                    BroadcastStore.save(parsed)
                    config = parsed
                    error = nil
                }
                Text("Scan the code shown in Mockup Studio.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            if let error {
                Text(error).font(.footnote).foregroundStyle(.red)
            }
        }
        .padding()
        .onAppear { adopt(incoming ?? BroadcastStore.load()) }
        .onChange(of: incoming) { _, next in adopt(next) }
    }

    /// One place where a config becomes the paired state, whichever way it
    /// arrived — deep link, scanner, or a session saved by a previous launch.
    private func adopt(_ next: BroadcastConfig?) {
        guard let next else { return }
        config = next
        error = nil
        warmLocalNetwork(next)
    }

    /// Touch the Mac once, from the app, as soon as we know its address.
    ///
    /// This is what makes iOS raise "allow local network access" here rather
    /// than in the middle of a broadcast. The permission is granted per app and
    /// shared with the extension, so answering it once on this screen is what
    /// lets the extension's first connection succeed — iOS fails whichever
    /// request triggers the prompt, and in the extension that failure ends the
    /// broadcast before it has sent a frame.
    ///
    /// The result is ignored on purpose: a refusal is reported later, by the
    /// code that actually needs the connection, with a message that can say
    /// what was being attempted.
    private func warmLocalNetwork(_ config: BroadcastConfig) {
        var request = URLRequest(url: config.pingURL)
        request.timeoutInterval = 5
        URLSession.shared.dataTask(with: request) { _, _, _ in }.resume()
    }

}

/// `RPSystemBroadcastPickerView` is UIKit-only and has no SwiftUI equivalent.
/// `preferredExtension` is what makes the sheet open on our extension rather
/// than listing every broadcast app on the device.
struct BroadcastPickerView: UIViewRepresentable {
    func makeUIView(context: Context) -> RPSystemBroadcastPickerView {
        let view = RPSystemBroadcastPickerView(
            frame: CGRect(x: 0, y: 0, width: 320, height: 54)
        )
        // Without this the sheet lists every broadcast-capable app on the
        // device instead of going straight to ours.
        view.preferredExtension = "com.koshmoney.mockupstudio.broadcast"
        view.showsMicrophoneButton = false
        view.backgroundColor = .clear

        // The view's own button is a ~44pt glyph pinned to the centre, so most
        // of a wide control is dead space. Stretching it makes the whole
        // capsule tappable, and hiding its image lets the label underneath
        // show through. Public API throughout — the button is a plain subview.
        if let button = view.subviews.compactMap({ $0 as? UIButton }).first {
            button.frame = view.bounds
            button.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            button.imageView?.alpha = 0
            button.backgroundColor = .clear
        }
        return view
    }

    func updateUIView(_ uiView: RPSystemBroadcastPickerView, context: Context) {}
}

/// A plain AVFoundation QR reader.
///
/// In-app rather than the system Camera app: the payload is a custom scheme,
/// and iOS will not reliably offer to open one it does not have registered.
/// Scanning here also keeps the whole flow offline.
struct QRScannerView: UIViewControllerRepresentable {
    let onScan: (String) -> Void

    func makeUIViewController(context: Context) -> ScannerController {
        let controller = ScannerController()
        controller.onScan = onScan
        return controller
    }

    func updateUIViewController(_ controller: ScannerController, context: Context) {}

    final class ScannerController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
        var onScan: ((String) -> Void)?
        private let session = AVCaptureSession()
        private var handled = false

        override func viewDidLoad() {
            super.viewDidLoad()
            guard let device = AVCaptureDevice.default(for: .video),
                  let input = try? AVCaptureDeviceInput(device: device),
                  session.canAddInput(input)
            else { return }
            session.addInput(input)

            let output = AVCaptureMetadataOutput()
            guard session.canAddOutput(output) else { return }
            session.addOutput(output)
            output.setMetadataObjectsDelegate(self, queue: .main)
            output.metadataObjectTypes = [.qr]

            let preview = AVCaptureVideoPreviewLayer(session: session)
            preview.videoGravity = .resizeAspectFill
            preview.frame = view.bounds
            view.layer.addSublayer(preview)

            Task.detached { [session] in session.startRunning() }
        }

        func metadataOutput(
            _ output: AVCaptureMetadataOutput,
            didOutput objects: [AVMetadataObject],
            from connection: AVCaptureConnection
        ) {
            // One scan only: the delegate fires per frame, and re-saving the
            // same config on every one of them is pure churn.
            guard !handled,
                  let object = objects.first as? AVMetadataMachineReadableCodeObject,
                  let value = object.stringValue
            else { return }
            handled = true
            session.stopRunning()
            onScan?(value)
        }
    }
}
