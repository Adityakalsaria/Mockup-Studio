import Foundation

/// The phone's end of `/api/broadcast/*`.
///
/// Text only, and only while the two peers are finding each other: an offer in,
/// an answer and some candidates out. Once ICE completes nothing else travels
/// this way — the video goes straight to the browser.
final class SignalClient: NSObject {
    enum Message {
        case offer(sdp: String)
        case answer(sdp: String)
        case candidate(sdp: String, mid: String?, index: Int32)
        case bye(reason: String)
    }

    private let config: BroadcastConfig
    private var task: URLSessionDataTask?
    private var stopped = false

    /// Reconnect attempts made since the last byte arrived.
    ///
    /// The first connection to a Mac on the local network is EXPECTED to fail:
    /// iOS raises its "allow local network access" prompt and kills the
    /// in-flight request while it waits for an answer. Treating that as fatal —
    /// which is what a single-shot connect does — means the very first
    /// broadcast can never work, whatever the user taps. So a failure is
    /// retried before it is ever reported.
    private var attempt = 0
    private let maxAttempts = 6
    private lazy var session: URLSession = {
        // Delegate-based rather than a completion handler: SSE never
        // "completes", so the body has to be consumed as it streams.
        URLSession(configuration: .default, delegate: self, delegateQueue: nil)
    }()

    /// Buffers a partial event across packet boundaries. An SSE frame is not
    /// guaranteed to arrive whole, and parsing half a JSON body throws away a
    /// candidate that will never be resent.
    private var buffer = Data()

    var onMessage: ((Message) -> Void)?
    var onError: ((String) -> Void)?

    init(config: BroadcastConfig) {
        self.config = config
    }

    func connect() {
        guard !stopped else { return }
        var request = URLRequest(url: config.streamURL())
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        // The stream is open for the life of the broadcast; the default 60s
        // would tear it down mid-session.
        request.timeoutInterval = .infinity
        task = session.dataTask(with: request)
        task?.resume()
    }

    /// Backs off a little between tries so a genuinely absent studio is not
    /// hammered, while a permission prompt — answered in a second or two — is
    /// picked up almost immediately.
    private func reconnect() {
        guard !stopped, attempt < maxAttempts else {
            if !stopped {
                onError?(
                    "Could not reach Mockup Studio on your Mac. Check both devices are on "
                        + "the same Wi-Fi, and that the studio is still open."
                )
            }
            return
        }
        attempt += 1
        let delay = Double(attempt) * 0.6
        DispatchQueue.global().asyncAfter(deadline: .now() + delay) { [weak self] in
            self?.connect()
        }
    }

    func stop() {
        stopped = true
        task?.cancel()
        task = nil
        session.invalidateAndCancel()
    }

    func send(_ message: Message) {
        var body: [String: Any] = ["sessionId": config.sessionId, "from": "phone"]

        switch message {
        case .answer(let sdp):
            body["kind"] = "answer"
            body["sdp"] = sdp
        case .offer(let sdp):
            body["kind"] = "offer"
            body["sdp"] = sdp
        case .candidate(let sdp, let mid, let index):
            body["kind"] = "candidate"
            body["candidate"] = [
                "candidate": sdp,
                "sdpMid": mid as Any,
                "sdpMLineIndex": index,
            ]
        case .bye(let reason):
            body["kind"] = "bye"
            body["reason"] = reason
        }

        var request = URLRequest(url: config.signalURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        post(request, remaining: 3)
    }

    /// POSTs retry too, and for the same reason as the stream: the answer and
    /// the first candidates are often in flight exactly when the Local Network
    /// prompt appears. Losing the answer strands the negotiation permanently —
    /// nothing resends it — so a dropped POST must not be a one-shot failure.
    private func post(_ request: URLRequest, remaining: Int) {
        URLSession.shared.dataTask(with: request) { [weak self] _, response, error in
            guard let self, !self.stopped else { return }

            if error != nil {
                if remaining > 0 {
                    DispatchQueue.global().asyncAfter(deadline: .now() + 0.5) {
                        self.post(request, remaining: remaining - 1)
                    }
                } else {
                    self.onError?("Could not reach the studio on your Mac.")
                }
                return
            }

            if let http = response as? HTTPURLResponse, http.statusCode == 404 {
                // The studio tab was closed or the QR expired. Distinct from a
                // transport error: the user needs to rescan, not retry.
                self.onError?("This pairing code is no longer open. Scan again.")
            }
        }.resume()
    }

    private func handle(line: String) {
        guard line.hasPrefix("data:") else { return }  // ": ping" heartbeats
        let payload = line.dropFirst(5).trimmingCharacters(in: .whitespaces)
        guard let data = payload.data(using: .utf8),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let kind = object["kind"] as? String
        else { return }

        switch kind {
        case "offer":
            if let sdp = object["sdp"] as? String { onMessage?(.offer(sdp: sdp)) }
        case "answer":
            if let sdp = object["sdp"] as? String { onMessage?(.answer(sdp: sdp)) }
        case "candidate":
            if let candidate = object["candidate"] as? [String: Any],
               let sdp = candidate["candidate"] as? String {
                onMessage?(.candidate(
                    sdp: sdp,
                    mid: candidate["sdpMid"] as? String,
                    index: Int32(candidate["sdpMLineIndex"] as? Int ?? 0)
                ))
            }
        case "bye":
            onMessage?(.bye(reason: object["reason"] as? String ?? "closed"))
        default:
            break
        }
    }
}

extension SignalClient: URLSessionDataDelegate {
    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        // Bytes arrived, so whatever was wrong is over. Anything after this is
        // a fresh problem and gets the full budget again.
        attempt = 0
        buffer.append(data)

        // Events are separated by a blank line. Anything after the last one is
        // an incomplete event and stays buffered.
        while let range = buffer.range(of: Data("\n\n".utf8)) {
            let chunk = buffer.subdata(in: buffer.startIndex..<range.lowerBound)
            buffer.removeSubrange(buffer.startIndex..<range.upperBound)
            guard let text = String(data: chunk, encoding: .utf8) else { continue }
            for line in text.split(separator: "\n", omittingEmptySubsequences: true) {
                handle(line: String(line))
            }
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        guard !stopped else { return }
        if let error, (error as NSError).code == NSURLErrorCancelled { return }
        // Every ending is retried, including a clean one: an SSE stream that
        // closes without error has still stopped delivering signalling.
        reconnect()
    }
}
