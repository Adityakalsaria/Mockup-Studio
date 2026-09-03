import Foundation

/// Where the Mac is, and which session to join.
///
/// Written by the container app the moment a QR is scanned, read by the
/// broadcast extension when iOS launches it. The two never run at the same
/// time — the app is usually suspended or terminated by the point the user
/// picks it in the system broadcast sheet — so a shared App Group container is
/// the only channel between them. There is no live IPC to use.
struct BroadcastConfig: Codable, Equatable {
    let sessionId: String
    let host: String
    let port: Int
    /// "http" or "https", mirroring however the studio is being served.
    let scheme: String

    var signalURL: URL { URL(string: "\(scheme)://\(host):\(port)/api/broadcast/signal")! }

    /// Where device motion goes. Reuses the studio's existing gyro transport
    /// rather than adding a second one: `/api/gyro` already fans out to the
    /// editor over SSE, and the editor already knows how to drive the model
    /// from it.
    var gyroURL: URL { URL(string: "\(scheme)://\(host):\(port)/api/gyro")! }

    /// Side-effect-free endpoint used to raise the Local Network prompt from
    /// the app, before the extension needs the permission. See the route.
    var pingURL: URL { URL(string: "\(scheme)://\(host):\(port)/api/broadcast/ping")! }

    func streamURL() -> URL {
        URL(string: "\(scheme)://\(host):\(port)/api/broadcast/stream?s=\(sessionId)&role=phone")!
    }

    /// Parses either form of the pairing payload.
    ///
    /// Two, because they are scanned by different cameras:
    ///
    /// - `http://192.168.1.5:3000/mockup-studio/join?s=…` — what the QR
    ///   encodes. A plain URL so the *stock* Camera app can act on it; a custom
    ///   scheme there fails with "no usable data found" on any phone that does
    ///   not have this app yet, which is every phone during setup. The address
    ///   is taken from the URL itself, so it cannot disagree with the machine
    ///   that served it.
    /// - `mockupstudio://join?s=…&h=…&p=…&x=…` — what the join page hands over,
    ///   and what this app's own scanner may also be shown directly.
    ///
    /// Neither resolves anything on the internet: both address the Mac on the
    /// local network.
    static func parse(_ raw: String) -> BroadcastConfig? {
        guard let components = URLComponents(string: raw) else { return nil }

        func value(_ name: String) -> String? {
            components.queryItems?.first { $0.name == name }?.value
        }

        guard let sessionId = value("s") else { return nil }

        if components.scheme == "mockupstudio", components.host == "join" {
            guard let host = value("h"),
                  let portText = value("p"),
                  let port = Int(portText)
            else { return nil }
            return BroadcastConfig(
                sessionId: sessionId,
                host: host,
                port: port,
                scheme: value("x") ?? "http"
            )
        }

        if let scheme = components.scheme,
           scheme == "http" || scheme == "https",
           let host = components.host,
           components.path.hasSuffix("/join") {
            return BroadcastConfig(
                sessionId: sessionId,
                host: host,
                port: components.port ?? (scheme == "https" ? 443 : 80),
                scheme: scheme
            )
        }

        return nil
    }
}

/// The App Group both targets share. Must match the capability configured on
/// the app AND the extension, or the extension reads an empty container and
/// the broadcast starts with nowhere to send frames.
enum BroadcastStore {
    static let appGroup = "group.com.koshmoney.mockupstudio"
    private static let key = "broadcast.config"

    static func save(_ config: BroadcastConfig) {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let data = try? JSONEncoder().encode(config)
        else { return }
        defaults.set(data, forKey: key)
    }

    static func load() -> BroadcastConfig? {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let data = defaults.data(forKey: key)
        else { return nil }
        return try? JSONDecoder().decode(BroadcastConfig.self, from: data)
    }
}
