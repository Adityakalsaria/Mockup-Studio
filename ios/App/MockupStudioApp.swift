import SwiftUI

@main
struct MockupStudioApp: App {
    /// A config handed in by the join page, rather than scanned in-app.
    ///
    /// Two ways in, because there are two ways here: the studio's QR opens a
    /// LAN page in Safari which hands off with `mockupstudio://join?…`, and the
    /// app's own scanner reads the same QR directly. Both end in a
    /// `BroadcastConfig`; only the route differs.
    @State private var incoming: BroadcastConfig?

    var body: some Scene {
        WindowGroup {
            PairingView(incoming: $incoming)
                .onOpenURL { url in
                    guard let config = BroadcastConfig.parse(url.absoluteString) else { return }
                    // Persisted here as well as in the scanner: the extension
                    // reads this container at launch, and the app may be gone
                    // by then.
                    BroadcastStore.save(config)
                    incoming = config
                }
        }
    }
}
