"use client";

import { useEffect, useRef } from "react";

// Land, as [west, east] longitude ranges for each 5° latitude band from 75°N to 55°S.
// Coarse on purpose: it only has to read as "the world" when drawn as dots.
const LAND: Record<number, [number, number][]> = {
  75: [[-120, -75], [-60, -20], [80, 110]],
  70: [[-165, -140], [-135, -80], [-55, -22], [18, 180]],
  65: [[-168, -62], [-53, -40], [-24, -14], [12, 180]],
  60: [[-165, -95], [-80, -64], [-48, -43], [5, 165]],
  55: [[-130, -60], [-8, 0], [8, 140], [155, 162]],
  50: [[-128, -58], [-5, 1], [2, 140]],
  45: [[-124, -62], [-1, 28], [40, 135], [141, 145]],
  40: [[-124, -74], [-9, 0], [9, 16], [20, 45], [53, 125], [126, 128], [139, 141]],
  35: [[-120, -76], [-6, 10], [36, 120], [126, 129], [132, 140]],
  30: [[-115, -82], [-10, 60], [61, 122]],
  25: [[-110, -98], [-81, -80], [-15, 35], [37, 57], [62, 90], [92, 120]],
  20: [[-105, -88], [-84, -75], [-17, 38], [40, 57], [72, 87], [93, 108]],
  15: [[-93, -84], [-17, 40], [43, 52], [74, 81], [98, 109], [120, 122]],
  10: [[-85, -77], [-75, -61], [-15, 51], [76, 79], [98, 100], [105, 107], [123, 126]],
  5: [[-77, -52], [-8, 47], [100, 103], [113, 118]],
  0: [[-80, -50], [9, 43], [99, 104], [109, 117], [120, 123]],
  [-5]: [[-81, -35], [12, 40], [102, 105], [138, 150]],
  [-10]: [[-78, -36], [13, 40], [142, 148]],
  [-15]: [[-76, -39], [12, 40], [47, 50], [125, 145]],
  [-20]: [[-70, -40], [13, 35], [44, 49], [118, 148]],
  [-25]: [[-70, -48], [15, 33], [45, 47], [114, 153]],
  [-30]: [[-71, -51], [17, 31], [115, 153]],
  [-35]: [[-72, -57], [19, 25], [117, 119], [135, 150]],
  [-40]: [[-73, -63], [145, 148], [173, 176]],
  [-45]: [[-74, -66], [168, 171]],
  [-50]: [[-74, -68]],
  [-55]: [[-70, -66]],
};

interface City {
  lat: number;
  lon: number;
}

// Hubs where distributed teams commonly sit; used only to draw connections.
const CITIES: City[] = [
  { lat: 12.97, lon: 77.59 }, // Bengaluru
  { lat: 51.5, lon: -0.12 }, // London
  { lat: 40.71, lon: -74.0 }, // New York
  { lat: 37.77, lon: -122.42 }, // San Francisco
  { lat: 1.35, lon: 103.82 }, // Singapore
  { lat: 25.2, lon: 55.27 }, // Dubai
  { lat: -33.87, lon: 151.21 }, // Sydney
  { lat: 52.52, lon: 13.4 }, // Berlin
  { lat: -23.55, lon: -46.63 }, // São Paulo
  { lat: 35.68, lon: 139.69 }, // Tokyo
];

const LINKS: [number, number][] = [
  [0, 1],
  [0, 4],
  [0, 5],
  [1, 2],
  [2, 3],
  [1, 7],
  [4, 6],
  [4, 9],
  [2, 8],
  [5, 1],
  [3, 9],
];

type Vec = [number, number, number];

const rad = (d: number) => (d * Math.PI) / 180;

function toVec(lat: number, lon: number): Vec {
  const phi = rad(lat);
  const theta = rad(lon);
  return [Math.cos(phi) * Math.sin(theta), Math.sin(phi), Math.cos(phi) * Math.cos(theta)];
}

function buildDots(): Vec[] {
  const dots: Vec[] = [];
  for (let lat = 75; lat >= -55; lat -= 2.5) {
    const band = LAND[Math.round(lat / 5) * 5] ?? [];
    // Wider longitude steps near the poles keep the dot density even.
    const step = 2.5 / Math.max(0.3, Math.cos(rad(lat)));
    for (const [west, east] of band) {
      for (let lon = west; lon <= east; lon += step) dots.push(toVec(lat, lon));
    }
  }
  return dots;
}

/** Spherical interpolation between two unit vectors. */
function slerp(a: Vec, b: Vec, t: number): Vec {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const omega = Math.acos(dot);
  if (omega < 1e-4) return a;
  const s = Math.sin(omega);
  const ka = Math.sin((1 - t) * omega) / s;
  const kb = Math.sin(t * omega) / s;
  return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
}

/**
 * A rotating dotted globe with arcs of light between cities, drawn on a 2D canvas.
 * Drag to spin it. Pauses when off screen; holds still for reduced-motion users.
 */
export function Globe({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dots = buildDots();
    const cities = CITIES.map((c) => toVec(c.lat, c.lon));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let size = 0;
    let rotation = rad(-60); // start with Europe, Africa and India facing the viewer
    const tilt = rad(18);
    let dragging: { x: number; start: number } | null = null;
    let visible = true;
    let frame = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = canvas.clientWidth;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);

    /** Rotate around Y by the current spin, then tilt toward the viewer. */
    const project = (v: Vec, lift = 1): { x: number; y: number; z: number } => {
      const cosR = Math.cos(rotation);
      const sinR = Math.sin(rotation);
      const x1 = v[0] * cosR + v[2] * sinR;
      const z1 = -v[0] * sinR + v[2] * cosR;
      const y2 = v[1] * Math.cos(tilt) - z1 * Math.sin(tilt);
      const z2 = v[1] * Math.sin(tilt) + z1 * Math.cos(tilt);
      const r = size * 0.42 * lift;
      return { x: size / 2 + x1 * r, y: size / 2 - y2 * r, z: z2 };
    };

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const dt = Math.min(64, now - last);
      last = now;
      if (!visible || size === 0) return;
      if (!reduced && !dragging) rotation += dt * 0.00012;

      ctx.clearRect(0, 0, size, size);
      const r = size * 0.42;

      // Atmosphere and body.
      const glow = ctx.createRadialGradient(size / 2, size / 2, r * 0.6, size / 2, size / 2, r * 1.25);
      glow.addColorStop(0, "rgba(99,102,241,0.16)");
      glow.addColorStop(1, "rgba(99,102,241,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);
      const body = ctx.createRadialGradient(size / 2 - r * 0.35, size / 2 - r * 0.4, r * 0.1, size / 2, size / 2, r);
      body.addColorStop(0, "rgba(40,40,64,0.95)");
      body.addColorStop(1, "rgba(11,11,15,0.95)");
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
      ctx.fillStyle = body;
      ctx.fill();
      ctx.strokeStyle = "rgba(129,140,248,0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Land dots: brighter toward the viewer.
      for (const d of dots) {
        const p = project(d);
        if (p.z <= 0) continue;
        ctx.fillStyle = `rgba(165,180,252,${0.18 + p.z * 0.6})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 0.9 + p.z * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Arcs between cities, each with a pulse travelling along it.
      LINKS.forEach(([a, b], i) => {
        const steps = 48;
        const pts: { x: number; y: number; z: number }[] = [];
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          pts.push(project(slerp(cities[a], cities[b], t), 1 + Math.sin(Math.PI * t) * 0.16));
        }
        ctx.lineWidth = 1.2;
        for (let s = 1; s <= steps; s++) {
          if (pts[s].z <= 0 || pts[s - 1].z <= 0) continue;
          ctx.strokeStyle = "rgba(129,140,248,0.35)";
          ctx.beginPath();
          ctx.moveTo(pts[s - 1].x, pts[s - 1].y);
          ctx.lineTo(pts[s].x, pts[s].y);
          ctx.stroke();
        }
        const head = reduced ? 0.5 : (now * 0.00028 + i * 0.37) % 1;
        const hp = pts[Math.floor(head * steps)];
        if (hp.z > 0) {
          const g = ctx.createRadialGradient(hp.x, hp.y, 0, hp.x, hp.y, 7);
          g.addColorStop(0, "rgba(224,231,255,1)");
          g.addColorStop(1, "rgba(129,140,248,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(hp.x, hp.y, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // City markers with a soft ripple.
      cities.forEach((c, i) => {
        const p = project(c);
        if (p.z <= 0) return;
        const ripple = reduced ? 0.5 : (now * 0.0006 + i * 0.21) % 1;
        ctx.strokeStyle = `rgba(52,211,153,${(1 - ripple) * 0.7})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 + ripple * 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#34d399";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      });
    };
    frame = requestAnimationFrame(draw);

    const down = (e: PointerEvent) => {
      dragging = { x: e.clientX, start: rotation };
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (dragging) rotation = dragging.start + (e.clientX - dragging.x) * 0.006;
    };
    const up = () => (dragging = null);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    };
  }, []);

  return <canvas ref={ref} className={className} style={{ aspectRatio: "1 / 1", touchAction: "pan-y" }} role="img" aria-label="A rotating globe showing teams connected across cities" />;
}
