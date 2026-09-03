import CoreMotion
import Foundation

/// Device orientation, sent from the broadcast extension.
///
/// ## Why this exists at all, when the studio already has a gyro
///
/// The web remote reads `deviceorientation` in Safari, and that has two
/// problems this does not:
///
/// 1. **It cannot run while you broadcast.** `DeviceMotion` events only fire
///    for a foreground page, and during a broadcast the phone is showing the
///    app being mocked up — not Safari. The two features were mutually
///    exclusive by construction.
/// 2. **It needs HTTPS.** iOS releases motion data only in a secure context,
///    so the LAN studio has to be served over TLS with certificates for a
///    local IP. CoreMotion in a native process has no such requirement.
///
/// The extension is already running, already connected, and already permitted.
final class MotionSender {
    private let config: BroadcastConfig
    private let motion = CMMotionManager()
    private let queue = OperationQueue()

    /// Matches the broadcast's frame rate. Faster buys nothing: the studio
    /// smooths toward the pose in its own render loop, so samples arriving
    /// between frames are averaged away rather than seen.
    private let hz: Double = 30

    init(config: BroadcastConfig) {
        self.config = config
        queue.maxConcurrentOperationCount = 1
        // Motion must never contend with the encoder for the main thread; a
        // dropped frame is far more visible than a late sample.
        queue.qualityOfService = .utility
    }

    func start() {
        guard motion.isDeviceMotionAvailable else { return }
        motion.deviceMotionUpdateInterval = 1 / hz
        // `.xArbitraryZVertical` rather than a magnetic reference: the studio
        // zeroes against a captured neutral pose anyway, so a heading costs a
        // magnetometer warm-up and a calibration prompt to produce an offset
        // that is immediately cancelled.
        motion.startDeviceMotionUpdates(
            using: .xArbitraryZVertical,
            to: queue
        ) { [weak self] data, _ in
            guard let self, let data else { return }
            self.send(data)
        }
    }

    func stop() {
        motion.stopDeviceMotionUpdates()
    }

    /// −90° about X: the rotation that takes a Z-up world to a Y-up one.
    ///
    /// CoreMotion reports attitude against a reference frame with **Z up**.
    /// The studio renders in three.js, whose world is **Y up**. This is the
    /// constant between them.
    ///
    /// ## It must PRE-multiply
    ///
    /// The web path in `gyro/quaternion.ts` post-multiplies the same constant,
    /// and copying that here was wrong. Post-multiplying applies a rotation in
    /// the BODY frame — it reorients the device within an unchanged world.
    /// What is needed is the opposite: leave the body alone and convert the
    /// WORLD, which is a pre-multiplication.
    ///
    /// The symptom of getting this backwards is specific and worth recording,
    /// because it looks like a half-working feature rather than a frame error:
    /// pitch behaves correctly while roll spins the model. Tilting toward you
    /// turns about the device's X axis, which lines up with the studio's X
    /// either way, so it tracks. Tilting left or right turns about the
    /// device's Y axis — and in an unconverted Z-up world the studio's Y is
    /// vertical, so a sideways tilt arrives as a yaw.
    private static let screenTilt = (x: -0.7071067811865476, y: 0.0, z: 0.0, w: 0.7071067811865476)

    private func send(_ data: CMDeviceMotion) {
        let a = data.attitude
        let q = a.quaternion

        // t * q — world conversion, not a body rotation. Quaternion
        // multiplication does not commute, and this order is the whole
        // difference between a phone that tracks and one that spins.
        let t = Self.screenTilt
        let x = t.w * q.x + t.x * q.w + t.y * q.z - t.z * q.y
        let y = t.w * q.y - t.x * q.z + t.y * q.w + t.z * q.x
        let z = t.w * q.z + t.x * q.y - t.y * q.x + t.z * q.w
        let w = t.w * q.w - t.x * q.x - t.y * q.y - t.z * q.z

        let length = (x * x + y * y + z * z + w * w).squareRoot()
        guard length > 0 else { return }

        let degrees = 180 / Double.pi
        // alpha/beta/gamma are display-only downstream — the model is driven by
        // the quaternion. Sent so the studio's readout has something to show.
        let body: [String: Any] = [
            "q": ["x": x / length, "y": y / length, "z": z / length, "w": w / length],
            "alpha": a.yaw * degrees,
            "beta": a.pitch * degrees,
            "gamma": a.roll * degrees,
            "t": Date().timeIntervalSince1970 * 1000,
        ]

        var request = URLRequest(url: config.gyroURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        // Short, and failures are dropped in silence: at 30 a second the next
        // sample is 33ms away, and retrying a stale pose is worse than missing
        // it. The broadcast must never stall on motion.
        request.timeoutInterval = 2
        URLSession.shared.dataTask(with: request).resume()
    }
}
