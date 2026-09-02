# Mockup Studio — iPhone broadcast

Live iPhone screen → 3D phone in the studio, over your own Wi-Fi.

**The video never touches a server.** `/api/broadcast/*` on your Mac carries the
WebRTC offer, answer and ICE candidates — a few kilobytes of text, once. The
frames go peer to peer. There is no cloud service, no media server, no relay, no
upload, no database, and nothing to reach on the internet.

```
iPhone                                          Mac
──────                                          ───
Broadcast extension                             next dev
  ReplayKit frames                                /api/broadcast/pair    QR + session
  └ RTCVideoSource (hardware H.264)               /api/broadcast/signal  offer/answer/ICE
       │                                          /api/broadcast/stream  SSE
       │  ◄──── text, during setup only ────►         │
       │                                              │
       └────────── H.264 media, direct ──────────► browser
                                                    ontrack → setLiveStream()
```

## What is here

| Path | Target |
|---|---|
| `project.yml` | XcodeGen definition — regenerates the project |
| `MockupStudio.xcodeproj` | Generated. Open this, or run `xcodegen generate` |
| `Shared/BroadcastConfig.swift` | Both — QR payload, App Group storage |
| `Shared/SignalClient.swift` | Both — POST + SSE against `/api/broadcast` |
| `App/MockupStudioApp.swift` | App — entry point, `mockupstudio://` handoff |
| `App/PairingView.swift` | App — QR scanner, broadcast picker |
| `BroadcastExtension/SampleHandler.swift` | Extension — ReplayKit → WebRTC |

Two targets: the app (`com.koshmoney.mockupstudio`) and the broadcast upload
extension embedded in it (`…mockupstudio.broadcast`). They share the App Group
`group.com.koshmoney.mockupstudio`, which is the only channel between them —
the app is not running by the time iOS launches the extension.

WebRTC comes from `github.com/stasel/WebRTC` (prebuilt libwebrtc XCFramework)
via SPM, resolved automatically on first build.

## Building

```bash
cd ios
xcodegen generate          # only after editing project.yml
open MockupStudio.xcodeproj
```

Or from the command line:

```bash
xcodebuild -project MockupStudio.xcodeproj -scheme MockupStudio \
  -sdk iphoneos -destination 'generic/platform=iOS' \
  -allowProvisioningUpdates build
```

`DEVELOPMENT_TEAM` is set in `project.yml`. The App Group capability requires a
paid Apple Developer account — free provisioning cannot create one, and there
is no way around it.

Deployment target is iOS 17 (SwiftUI's two-parameter `onChange`).

## Running it

1. `npm run dev` on the Mac.
2. Open `/mockup-studio` → **Source** → **Broadcast from iPhone**.
3. Scan the QR in the iPhone app, tap the broadcast button, pick Mockup Studio.

If the studio says it has no LAN address, it is on a VPN or a USB tether with no
real network behind it. Override with `MOCKUP_STUDIO_LAN_HOST=192.168.1.x npm run dev`.

## Known constraints

- **50 MB.** The extension is hard-killed above roughly that. Pixel buffers go
  to `RTCVideoSource` untouched and libwebrtc owns the hardware encoder —
  keep it that way. Any per-frame conversion or copy will blow the budget.
- **Same Wi-Fi, no isolation.** `iceServers` is empty on both ends by design,
  so only host candidates are gathered. Guest and hotel networks that block
  device-to-device traffic will fail — reported, not silently retried.
- **mDNS candidates.** Browsers publish `<uuid>.local` host candidates rather
  than raw IPs. Resolution normally works on a LAN, but it is the first thing
  to check if ICE gathers and then never connects.
- **`bus.ts` is single-process.** Signalling state lives in module memory, like
  the gyro feature it mirrors. Correct for a local tool, wrong on a serverless
  deploy — that file is the seam to replace if the studio is ever hosted.
