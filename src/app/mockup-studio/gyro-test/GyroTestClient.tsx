"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GyroSample } from "@/features/mockup-studio/gyro/bus";
import {
  IDENTITY,
  relativeTo,
  slerp,
  toCssRotate3d,
  type Quat,
} from "@/features/mockup-studio/gyro/quaternion";

/**
 * The desktop half of the gyro test.
 *
 * Deliberately not the studio: this is here to answer one question — does a
 * phone's orientation reach this machine, fast enough and smooth enough to
 * drive a 3D phone — before any of it is wired into the editor, where a
 * failure would be tangled up with the timeline and the keyframe system.
 *
 * The rotating card is CSS 3D, not three.js, for the same reason.
 */

/**
 * Easing time constant in seconds — the same critically-damped scheme
 * PhoneStage3D applies to every transform, so what looks smooth here will look
 * smooth there.
 *
 * Expressed as a time constant rather than a per-frame fraction on purpose: a
 * fixed `0.15` per frame eases more than twice as fast on a 120 Hz display as
 * on a 60 Hz one, so the feel would depend on the monitor.
 */
const TAU = 0.08;

export default function GyroTestClient({ lanIp }: { lanIp: string | null }) {
  const [connected, setConnected] = useState(false);
  const [sample, setSample] = useState<GyroSample | null>(null);
  const [rate, setRate] = useState(0);
  const [latency, setLatency] = useState<number | null>(null);
  const [zeroed, setZeroed] = useState(false);

  // Smoothed pose, driven by rAF rather than by React state, so the card moves
  // at display rate instead of at whatever rate samples happen to arrive.
  const target = useRef<Quat>(IDENTITY);
  const cardRef = useRef<HTMLDivElement>(null);
  const zeroRef = useRef<Quat | null>(null);
  const latestRef = useRef<GyroSample | null>(null);
  const stamps = useRef<number[]>([]);
  const lastPaint = useRef(0);

  useEffect(() => {
    const source = new EventSource("/api/gyro/stream");

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (event) => {
      const next = JSON.parse(event.data) as GyroSample;
      latestRef.current = next;

      const now = performance.now();
      stamps.current.push(now);
      while (stamps.current.length && now - stamps.current[0] > 1000) stamps.current.shift();

      // The panel is a readout, not the animation. Repainting it per sample
      // re-rendered this component 30 times a second, and React's own work
      // then competed with the rAF loop — which is the other half of the
      // flicker, on top of the gimbal lock.
      if (now - lastPaint.current > 200) {
        lastPaint.current = now;
        setSample(next);
        setRate(stamps.current.length);
        // The phone stamps `t` with its own clock, so this is only meaningful
        // when the two clocks agree. Treat it as a smoke test for "is the feed
        // live", not as a measurement.
        setLatency(Date.now() - next.t);
      }

      const origin = zeroRef.current;
      target.current = origin ? relativeTo(origin, next.q) : next.q;
    };

    return () => source.close();
  }, []);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    let current: Quat = IDENTITY;

    const tick = (now: number) => {
      // Clamped so a backgrounded tab returning after seconds eases in rather
      // than teleporting through a dt of 4000 ms.
      const dt = Math.min((now - previous) / 1000, 0.1);
      previous = now;

      current = slerp(current, target.current, 1 - Math.exp(-dt / TAU));

      if (cardRef.current) {
        const { x, y, z, deg } = toCssRotate3d(current);
        cardRef.current.style.transform = `rotate3d(${x}, ${y}, ${z}, ${deg}deg)`;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // The equivalent of the 重置姿态校准 button in the reference tool. The sensor
  // reports against magnetic north and gravity, not against you, so without
  // this the card faces wherever north happens to be.
  const calibrate = useCallback(() => {
    const current = latestRef.current;
    if (current) {
      zeroRef.current = current.q;
      setZeroed(true);
    }
  }, []);

  const remoteUrl = lanIp
    ? `${typeof window !== "undefined" ? window.location.protocol : "https:"}//${lanIp}${
        typeof window !== "undefined" && window.location.port ? `:${window.location.port}` : ""
      }/mockup-studio/remote`
    : null;

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#0b0b0c",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) 320px",
      }}
    >
      <section style={{ display: "grid", placeItems: "center", perspective: 1200 }}>
        <div
          ref={cardRef}
          style={{
            width: 200,
            height: 410,
            borderRadius: 34,
            background: "linear-gradient(160deg,#2b2b30,#141417)",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 40px 80px rgba(0,0,0,0.55)",
            transformStyle: "preserve-3d",
            display: "grid",
            placeItems: "center",
            color: "rgba(255,255,255,0.35)",
            fontSize: 13,
          }}
        >
          phone
        </div>
      </section>

      <aside
        style={{
          borderLeft: "1px solid rgba(255,255,255,0.1)",
          padding: 20,
          display: "grid",
          gap: 18,
          alignContent: "start",
        }}
      >
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Gyro test</h1>
          <p style={{ opacity: 0.55, fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
            Proving the phone → desktop feed before touching the studio.
          </p>
        </div>

        <Row label="Stream" value={connected ? "connected" : "waiting"} good={connected} />
        <Row label="Rate" value={`${rate} Hz`} good={rate > 0} />
        <Row
          label="Latency"
          value={latency === null ? "—" : `${latency} ms`}
          good={latency !== null && latency < 250}
        />

        <div style={box}>
          <Reading label="α" value={sample?.alpha} />
          <Reading label="β" value={sample?.beta} />
          <Reading label="γ" value={sample?.gamma} />
        </div>

        <button type="button" onClick={calibrate} style={button} disabled={!sample}>
          {zeroed ? "Re-zero" : "Set zero"}
        </button>

        <div style={{ fontSize: 12, opacity: 0.55, lineHeight: 1.6 }}>
          <strong style={{ opacity: 0.9 }}>On the phone, open:</strong>
          <div
            style={{
              marginTop: 6,
              padding: "8px 10px",
              background: "rgba(255,255,255,0.07)",
              borderRadius: 8,
              wordBreak: "break-all",
              fontFamily: "ui-monospace, monospace",
              color: "#fff",
            }}
          >
            {remoteUrl ?? "no LAN address found"}
          </div>
          <p style={{ marginTop: 10 }}>
            Must be HTTPS, or iOS refuses motion access. Start with{" "}
            <code>npm run dev:https</code>.
          </p>
        </div>
      </aside>
    </main>
  );
}

function Row({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ opacity: 0.55 }}>{label}</span>
      <span style={{ color: good ? "#34d058" : "#f0a020" }}>{value}</span>
    </div>
  );
}

function Reading({ label, value }: { label: string; value?: number }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ opacity: 0.45, fontSize: 11 }}>{label}</div>
      <div style={{ fontVariantNumeric: "tabular-nums", fontSize: 16 }}>
        {value === undefined ? "—" : `${value.toFixed(1)}°`}
      </div>
    </div>
  );
}

const box: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3,1fr)",
  gap: 8,
  padding: "12px 0",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
};

const button: React.CSSProperties = {
  appearance: "none",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 10,
  padding: "10px 14px",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontSize: 13,
};
