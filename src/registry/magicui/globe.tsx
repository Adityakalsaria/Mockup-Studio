"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import geoJsonData from "@/data/globe.json";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GLOBE_RADIUS = 100;
const CAMERA_Z = 205;
const DOT_COUNT = 30000;
const AUTO_ROTATE_SPEED = 0.001;
const LAND_TEXTURE_WIDTH = 2048;
const LAND_TEXTURE_HEIGHT = 1024;

const ARC_DRAW_DURATION = 2000; // ms to draw one arc
const ARC_HOLD_DURATION = 1000; // ms to hold after fully drawn
const ARC_FADE_DURATION = 800; // ms to fade out
const ARC_STAGGER = 600; // ms between starting successive arcs

const ARCS_DATA: [number, number, number, number][] = [
  [28.6, 77.2, 37.8, -122.4], // Delhi → San Francisco
  [51.5, -0.1, 40.7, -74.0], // London → New York
  [1.35, 103.8, 51.5, -0.1], // Singapore → London
  [19.1, 72.9, 40.7, -74.0], // Mumbai → New York
  [48.9, 2.35, 37.8, -122.4], // Paris → San Francisco
  [-23.5, -46.6, 40.7, -74.0], // São Paulo → New York
  [28.6, 77.2, 1.35, 103.8], // Delhi → Singapore
  [19.1, 72.9, 51.5, -0.1], // Mumbai → London
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function latLngToXYZ(
  lat: number,
  lng: number,
  radius: number,
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

// ---------------------------------------------------------------------------
// Land texture – render GeoJSON onto an offscreen canvas
// ---------------------------------------------------------------------------

function createLandTexture(): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = LAND_TEXTURE_WIDTH;
  canvas.height = LAND_TEXTURE_HEIGHT;
  const ctx = canvas.getContext("2d")!;

  // Black background (water)
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, LAND_TEXTURE_WIDTH, LAND_TEXTURE_HEIGHT);

  // White fill for land
  ctx.fillStyle = "#fff";

  const features = (geoJsonData as any).features as any[];

  for (const feature of features) {
    const { type, coordinates } = feature.geometry;
    const polygons: number[][][][] =
      type === "Polygon" ? [coordinates] : coordinates;

    for (const polygon of polygons) {
      ctx.beginPath();
      for (let ringIdx = 0; ringIdx < polygon.length; ringIdx++) {
        const ring = polygon[ringIdx];
        for (let i = 0; i < ring.length; i++) {
          const [lng, lat] = ring[i];
          // Equirectangular projection
          const x = ((lng + 180) / 360) * LAND_TEXTURE_WIDTH;
          const y = ((90 - lat) / 180) * LAND_TEXTURE_HEIGHT;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      }
      ctx.fill("evenodd");
    }
  }

  return ctx.getImageData(0, 0, LAND_TEXTURE_WIDTH, LAND_TEXTURE_HEIGHT);
}

function isLand(
  imageData: ImageData,
  lat: number,
  lng: number,
): boolean {
  const x = Math.floor(((lng + 180) / 360) * imageData.width);
  const y = Math.floor(((90 - lat) / 180) * imageData.height);
  const clampedX = Math.max(0, Math.min(imageData.width - 1, x));
  const clampedY = Math.max(0, Math.min(imageData.height - 1, y));
  const idx = (clampedY * imageData.width + clampedX) * 4;
  return imageData.data[idx] > 128;
}

// ---------------------------------------------------------------------------
// Fibonacci sphere dot positions (only on land)
// ---------------------------------------------------------------------------

function generateLandDots(imageData: ImageData): Float32Array {
  const positions: number[] = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;

  for (let i = 0; i < DOT_COUNT; i++) {
    const theta = Math.acos(1 - (2 * (i + 0.5)) / DOT_COUNT);
    const phi = (2 * Math.PI * i) / goldenRatio;

    const lat = 90 - (theta * 180) / Math.PI;
    const lng = ((phi * 180) / Math.PI) % 360 - 180;

    if (isLand(imageData, lat, lng)) {
      const pos = latLngToXYZ(lat, lng, GLOBE_RADIUS);
      positions.push(pos.x, pos.y, pos.z);
    }
  }

  return new Float32Array(positions);
}

// ---------------------------------------------------------------------------
// Arc geometry builder
// ---------------------------------------------------------------------------

interface ArcMeshInfo {
  mesh: THREE.Mesh;
  totalVertices: number;
}

function createArcMesh(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): ArcMeshInfo {
  const start = latLngToXYZ(fromLat, fromLng, GLOBE_RADIUS);
  const end = latLngToXYZ(toLat, toLng, GLOBE_RADIUS);

  // Arc height proportional to distance
  const dist = start.distanceTo(end);
  const midHeight = GLOBE_RADIUS + dist * 0.4;

  // Mid-point on sphere surface, then push outward
  const mid = new THREE.Vector3()
    .addVectors(start, end)
    .multiplyScalar(0.5)
    .normalize()
    .multiplyScalar(midHeight);

  // Control points for cubic bezier
  const ctrl1 = new THREE.Vector3()
    .lerpVectors(start, mid, 0.33)
    .normalize()
    .multiplyScalar(
      GLOBE_RADIUS + (midHeight - GLOBE_RADIUS) * 0.6,
    );
  const ctrl2 = new THREE.Vector3()
    .lerpVectors(end, mid, 0.33)
    .normalize()
    .multiplyScalar(
      GLOBE_RADIUS + (midHeight - GLOBE_RADIUS) * 0.6,
    );

  const curve = new THREE.CubicBezierCurve3(start, ctrl1, ctrl2, end);
  const tubeSegments = 64;
  const geometry = new THREE.TubeGeometry(curve, tubeSegments, 0.1, 6, false);

  const material = new THREE.MeshBasicMaterial({
    color: 0x2563eb,
    transparent: true,
    opacity: 0.8,
  });

  const mesh = new THREE.Mesh(geometry, material);
  const totalVertices = geometry.index ? geometry.index.count : geometry.attributes.position.count;
  // Start hidden
  geometry.setDrawRange(0, 0);

  return { mesh, totalVertices };
}

// ---------------------------------------------------------------------------
// React Component
// ---------------------------------------------------------------------------

export function StripeGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  const CONFIG = {
    cameraZ: 380,
    globeY: -40,
    tiltX: 0.3,
    dotOpacity: 0.45,
    dotSize: 0.35,
    arcOpacity: 0.8,
    arcTube: 0.1,
    globeColor: "#1a1a1a",
    glowOpacity: 0.08,
    rotateSpeed: 0.001,
    fov: 24,
  };

  useEffect(() => {
    // Handle React strict mode double-mount
    if (mountedRef.current) return;
    mountedRef.current = true;

    const container = containerRef.current;
    if (!container) return;

    // ---- Renderer ----
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    const rect = container.getBoundingClientRect();
    let width = rect.width || 710;
    let height = rect.height || 710;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // ---- Scene ----
    const scene = new THREE.Scene();

    // ---- Camera ----
    const camera = new THREE.PerspectiveCamera(CONFIG.fov, width / height, 1, 1000);
    camera.position.set(0, 0, CONFIG.cameraZ);

    // ---- Lighting ----
    const ambientLight = new THREE.AmbientLight(0xbbbbbb, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);

    // ---- Globe group (for rotation) ----
    const globeGroup = new THREE.Group();
    globeGroup.position.y = CONFIG.globeY;
    scene.add(globeGroup);

    // ---- Dark sphere base ----
    const sphereGeom = new THREE.SphereGeometry(GLOBE_RADIUS - 0.5, 64, 64);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(CONFIG.globeColor),
      transparent: true,
      opacity: 1,
    });
    const sphere = new THREE.Mesh(sphereGeom, sphereMat);
    globeGroup.add(sphere);

    // ---- Subtle glow ring ----
    const glowGeom = new THREE.SphereGeometry(GLOBE_RADIUS + 1.5, 64, 64);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x333333,
      transparent: true,
      opacity: CONFIG.glowOpacity,
      side: THREE.BackSide,
    });
    const glowMesh = new THREE.Mesh(glowGeom, glowMat);
    globeGroup.add(glowMesh);

    // ---- Land dots (InstancedMesh) ----
    const landTexture = createLandTexture();
    const dotPositions = generateLandDots(landTexture);
    const dotCount = dotPositions.length / 3;

    const dotGeom = new THREE.CircleGeometry(CONFIG.dotSize, 5);
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: CONFIG.dotOpacity,
      side: THREE.DoubleSide,
    });

    const instancedDots = new THREE.InstancedMesh(dotGeom, dotMat, dotCount);
    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < dotCount; i++) {
      const x = dotPositions[i * 3];
      const y = dotPositions[i * 3 + 1];
      const z = dotPositions[i * 3 + 2];
      dummy.position.set(x, y, z);
      // Orient circle to face outward from globe center
      const normal = new THREE.Vector3(x, y, z).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        normal,
      );
      dummy.quaternion.copy(quat);
      dummy.updateMatrix();
      instancedDots.setMatrixAt(i, dummy.matrix);
    }
    instancedDots.instanceMatrix.needsUpdate = true;
    globeGroup.add(instancedDots);

    // ---- Arcs ----
    interface ArcState {
      info: ArcMeshInfo;
      startTime: number;
      phase: "drawing" | "holding" | "fading" | "done";
    }

    const arcStates: ArcState[] = [];
    let arcCycleStart = performance.now();
    let currentBatchStart = 0;

    function spawnArcBatch(now: number) {
      // Remove old arcs
      for (const arc of arcStates) {
        globeGroup.remove(arc.info.mesh);
        arc.info.mesh.geometry.dispose();
        (arc.info.mesh.material as THREE.Material).dispose();
      }
      arcStates.length = 0;

      arcCycleStart = now;
      for (let i = 0; i < ARCS_DATA.length; i++) {
        const [fLat, fLng, tLat, tLng] = ARCS_DATA[i];
        const info = createArcMesh(fLat, fLng, tLat, tLng);
        globeGroup.add(info.mesh);
        arcStates.push({
          info,
          startTime: now + i * ARC_STAGGER,
          phase: "drawing",
        });
      }
    }

    spawnArcBatch(performance.now());

    // ---- Interaction state ----
    let pointerIsDown = false;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let rotationY = 0;
    let rotationX = CONFIG.tiltX;
    let dragDeltaY = 0;
    let dragDeltaX = 0;
    let velocityY = 0;
    let lastPointerX = 0;

    const onPointerDown = (e: PointerEvent) => {
      pointerIsDown = true;
      pointerStartX = e.clientX;
      pointerStartY = e.clientY;
      lastPointerX = e.clientX;
      dragDeltaY = 0;
      dragDeltaX = 0;
      velocityY = 0;
      renderer.domElement.style.cursor = "grabbing";
      renderer.domElement.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointerIsDown) return;
      dragDeltaY = (e.clientX - pointerStartX) * 0.005;
      dragDeltaX = (e.clientY - pointerStartY) * 0.005;
      velocityY = (e.clientX - lastPointerX) * 0.005;
      lastPointerX = e.clientX;
    };

    const onPointerUp = (e: PointerEvent) => {
      pointerIsDown = false;
      rotationY += dragDeltaY;
      rotationX += dragDeltaX;
      // Clamp vertical rotation
      rotationX = Math.max(-1.2, Math.min(1.2, rotationX));
      dragDeltaY = 0;
      dragDeltaX = 0;
      renderer.domElement.style.cursor = "grab";
    };

    renderer.domElement.style.cursor = "grab";
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);

    // ---- Resize ----
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        if (cr.width > 0 && cr.height > 0) {
          width = cr.width;
          height = cr.height;
          renderer.setSize(width, height);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        }
      }
    });
    ro.observe(container);

    // ---- Animation loop ----
    let animFrameId: number;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const now = performance.now();

      // Auto-rotation
      if (!pointerIsDown) {
        rotationY += CONFIG.rotateSpeed;
        // Inertia
        rotationY += velocityY;
        velocityY *= 0.95;
        if (Math.abs(velocityY) < 0.00001) velocityY = 0;
      }

      const totalY = rotationY + dragDeltaY;
      const totalX = Math.max(
        -1.2,
        Math.min(1.2, rotationX + dragDeltaX),
      );

      globeGroup.rotation.y = totalY;
      globeGroup.rotation.x = totalX;

      // ---- Animate arcs ----
      const cycleTotalDuration =
        ARCS_DATA.length * ARC_STAGGER +
        ARC_DRAW_DURATION +
        ARC_HOLD_DURATION +
        ARC_FADE_DURATION;

      if (now - arcCycleStart > cycleTotalDuration) {
        spawnArcBatch(now);
      }

      for (const arc of arcStates) {
        const elapsed = now - arc.startTime;
        if (elapsed < 0) {
          // Not started yet
          arc.info.mesh.geometry.setDrawRange(0, 0);
          continue;
        }

        const mat = arc.info.mesh.material as THREE.MeshBasicMaterial;
        const totalVerts = arc.info.totalVertices;

        if (elapsed < ARC_DRAW_DURATION) {
          // Drawing phase
          arc.phase = "drawing";
          const progress = elapsed / ARC_DRAW_DURATION;
          // Ease out
          const eased = 1 - Math.pow(1 - progress, 2);
          const count = Math.floor(eased * totalVerts);
          arc.info.mesh.geometry.setDrawRange(0, count);
          mat.opacity = 0.8;
        } else if (elapsed < ARC_DRAW_DURATION + ARC_HOLD_DURATION) {
          // Holding phase – fully visible
          arc.phase = "holding";
          arc.info.mesh.geometry.setDrawRange(0, totalVerts);
          mat.opacity = 0.8;
        } else if (
          elapsed <
          ARC_DRAW_DURATION + ARC_HOLD_DURATION + ARC_FADE_DURATION
        ) {
          // Fading phase
          arc.phase = "fading";
          arc.info.mesh.geometry.setDrawRange(0, totalVerts);
          const fadeProgress =
            (elapsed - ARC_DRAW_DURATION - ARC_HOLD_DURATION) /
            ARC_FADE_DURATION;
          mat.opacity = 0.8 * (1 - fadeProgress);
        } else {
          // Done
          arc.phase = "done";
          arc.info.mesh.geometry.setDrawRange(0, 0);
          mat.opacity = 0;
        }
      }

      renderer.render(scene, camera);
    };

    animFrameId = requestAnimationFrame(animate);

    // ---- Cleanup ----
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(animFrameId);
      ro.disconnect();

      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);

      // Dispose arcs
      for (const arc of arcStates) {
        globeGroup.remove(arc.info.mesh);
        arc.info.mesh.geometry.dispose();
        (arc.info.mesh.material as THREE.Material).dispose();
      }

      // Dispose dots
      dotGeom.dispose();
      dotMat.dispose();

      // Dispose sphere
      sphereGeom.dispose();
      sphereMat.dispose();

      // Dispose glow
      glowGeom.dispose();
      glowMat.dispose();

      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        userSelect: "none",
        overflow: "hidden",
      }}
    />
  );
}
