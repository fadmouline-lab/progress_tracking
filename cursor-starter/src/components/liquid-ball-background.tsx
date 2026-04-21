"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

export function LiquidBallBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const darkModeRef = useRef(false);

  useEffect(() => {
    darkModeRef.current = resolvedTheme === "dark";
  }, [resolvedTheme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const buf = document.createElement("canvas");
    const bctx = buf.getContext("2d", { willReadFrequently: false });
    if (!bctx) return;

    let W = 0, H = 0, DPR = 1;
    let animId: number;

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.floor(window.innerWidth);
      H = Math.floor(window.innerHeight);
      canvas!.width = W * DPR;
      canvas!.height = H * DPR;
      canvas!.style.width = W + "px";
      canvas!.style.height = H + "px";
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
      buf.width = W * DPR;
      buf.height = H * DPR;
      bctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
      edges.forEach((e) => e.rebuild(H));
    }

    class LiquidEdge {
      side: "L" | "R";
      rest = 14;
      spacing = 6;
      n = 0;
      h: Float32Array = new Float32Array(0);
      v: Float32Array = new Float32Array(0);
      damping = 0.965;
      tension = 0.018;
      spread = 0.22;

      constructor(side: "L" | "R") {
        this.side = side;
      }

      rebuild(height: number) {
        this.n = Math.ceil(height / this.spacing) + 2;
        this.h = new Float32Array(this.n);
        this.v = new Float32Array(this.n);
      }

      disturb(y: number, force: number, radius = 80) {
        const cy = y / this.spacing;
        const r = radius / this.spacing;
        for (let i = 0; i < this.n; i++) {
          const d = (i - cy) / r;
          if (d > -2 && d < 2) this.v[i] += force * Math.exp(-d * d * 1.2);
        }
      }

      step(dt: number) {
        const { h, v, n } = this;
        for (let i = 0; i < n; i++) {
          v[i] += -this.tension * h[i];
          v[i] *= this.damping;
          h[i] += v[i];
        }
        const ld = new Float32Array(n), rd = new Float32Array(n);
        for (let pass = 0; pass < 2; pass++) {
          for (let i = 0; i < n; i++) {
            if (i > 0)     { ld[i] = this.spread * (h[i] - h[i - 1]); v[i - 1] += ld[i]; }
            if (i < n - 1) { rd[i] = this.spread * (h[i] - h[i + 1]); v[i + 1] += rd[i]; }
          }
          for (let i = 0; i < n; i++) {
            if (i > 0)     h[i - 1] += ld[i] * 0.5;
            if (i < n - 1) h[i + 1] += rd[i] * 0.5;
          }
        }
      }

      stamp(g: CanvasRenderingContext2D) {
        const isL = this.side === "L";
        for (let i = 0; i < this.n; i++) {
          const y = i * this.spacing;
          const thickness = this.rest + this.h[i];
          if (thickness <= 0.5) continue;
          const x = isL ? thickness * 0.5 : W - thickness * 0.5;
          const r = Math.max(thickness, 10);
          stampBlob(g, x, y, r * 1.15, 1.0);
        }
      }

      surfaceX(y: number) {
        const idx = Math.max(0, Math.min(this.n - 1, Math.round(y / this.spacing)));
        const thickness = this.rest + this.h[idx];
        return this.side === "L" ? thickness : W - thickness;
      }
    }

    const edgeL = new LiquidEdge("L");
    const edgeR = new LiquidEdge("R");
    const edges = { L: edgeL, R: edgeR, forEach(fn: (e: LiquidEdge) => void) { fn(edgeL); fn(edgeR); } };

    function stampBlob(g: CanvasRenderingContext2D, x: number, y: number, r: number, intensity = 1) {
      if (r <= 0) return;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0.00, `rgba(0,0,0,${1.0 * intensity})`);
      grd.addColorStop(0.55, `rgba(0,0,0,${0.55 * intensity})`);
      grd.addColorStop(1.00, "rgba(0,0,0,0)");
      g.fillStyle = grd;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }

    const droplets: { x: number; y: number; vx: number; vy: number; r: number; life: number; age: number }[] = [];

    function spawnDroplet(x: number, y: number, vx: number, vy: number, r: number, life = 700) {
      droplets.push({ x, y, vx, vy, r, life, age: 0 });
    }

    function stepDroplets(dt: number) {
      for (let i = droplets.length - 1; i >= 0; i--) {
        const d = droplets[i];
        d.age += dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.vx *= 0.985;
        d.vy *= 0.985;
        const t = d.age / d.life;
        if (t >= 1) { droplets.splice(i, 1); continue; }
        if (d.x <= edgeL.rest + 4) { edgeL.disturb(d.y, -Math.hypot(d.vx, d.vy) * 0.6 - 4, 50); droplets.splice(i, 1); continue; }
        if (d.x >= W - edgeR.rest - 4) { edgeR.disturb(d.y, -Math.hypot(d.vx, d.vy) * 0.6 - 4, 50); droplets.splice(i, 1); continue; }
      }
    }

    function stampDroplets(g: CanvasRenderingContext2D) {
      for (const d of droplets) {
        const t = d.age / d.life;
        stampBlob(g, d.x, d.y, d.r * (1 - t * 0.35) * 1.4, 0.9);
      }
    }

    const BASE_R = Math.max(52, Math.min(76, Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.06)));

    const ball: {
      phase: string; side: "L" | "R"; t: number; x: number; y: number;
      vx: number; vy: number; r: number; neckStrength: number; stretch: number;
      idleWait: number; nextSide?: "L" | "R";
    } = {
      phase: "idle", side: "L", t: 0, x: 0, y: 0,
      vx: 0, vy: 0, r: BASE_R, neckStrength: 1, stretch: 1, idleWait: 1200,
    };

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeInCubic  = (t: number) => t * t * t;

    function beginForming(side: "L" | "R") {
      ball.phase = "forming"; ball.side = side; ball.t = 0;
      ball.y = H * (0.25 + Math.random() * 0.5);
      ball.x = side === "L" ? edgeL.rest : W - edgeR.rest;
      ball.r = BASE_R; ball.neckStrength = 1; ball.stretch = 1; ball.vx = 0; ball.vy = 0;
      (side === "L" ? edgeL : edgeR).disturb(ball.y, 3.5, 140);
    }

    function beginLaunch() {
      const e = ball.side === "L" ? edgeL : edgeR;
      e.disturb(ball.y, -22, 120);
      const dir = ball.side === "L" ? 1 : -1;
      for (let i = 0; i < 6; i++) {
        const a = (Math.random() - 0.5) * 0.9;
        const sp = 0.25 + Math.random() * 0.35;
        spawnDroplet(ball.x, ball.y + (Math.random() - 0.5) * BASE_R * 0.4,
          dir * sp * Math.cos(a), sp * Math.sin(a), 4 + Math.random() * 7, 500 + Math.random() * 300);
      }
      ball.vx = dir * (1.8 + Math.random() * 0.35);
      ball.vy = (Math.random() - 0.5) * 0.05;
      ball.phase = "fly";
    }

    function beginImpact() {
      ball.phase = "impact"; ball.t = 0;
      const hitSide: "L" | "R" = ball.vx > 0 ? "R" : "L";
      const e = edges[hitSide];
      e.disturb(ball.y, 55, 180);
      e.disturb(ball.y - 140, 14, 110);
      e.disturb(ball.y + 140, 14, 110);
      const dirBack = ball.vx > 0 ? -1 : 1;
      for (let i = 0; i < 22; i++) {
        const a = (Math.random() - 0.5) * 2.2;
        const sp = 0.35 + Math.random() * 0.9;
        spawnDroplet(ball.x, ball.y, dirBack * sp * Math.abs(Math.cos(a)), sp * Math.sin(a), 3 + Math.random() * 9, 450 + Math.random() * 550);
      }
      for (let i = 0; i < 5; i++) {
        const a = (Math.random() - 0.5) * 1.4;
        const sp = 0.55 + Math.random() * 0.6;
        spawnDroplet(ball.x, ball.y + (Math.random() - 0.5) * 30, dirBack * sp * Math.abs(Math.cos(a)), sp * Math.sin(a), 8 + Math.random() * 8, 650 + Math.random() * 500);
      }
      ball.nextSide = hitSide;
    }

    function beginIdle() {
      ball.phase = "idle"; ball.t = 0;
      ball.idleWait = 700 + Math.random() * 500;
    }

    function update(dt: number) {
      edges.forEach((e) => e.step(dt));
      stepDroplets(dt);
      ball.t += dt;

      if (ball.phase === "idle") {
        if (Math.random() < 0.012) {
          const e = Math.random() < 0.5 ? edgeL : edgeR;
          e.disturb(Math.random() * H, (Math.random() - 0.5) * 1.2, 90);
        }
        if (ball.t >= ball.idleWait) beginForming(ball.nextSide || ball.side);
      } else if (ball.phase === "forming") {
        const D = 1400, u = Math.min(1, ball.t / D);
        const e = ball.side === "L" ? edgeL : edgeR;
        if (Math.random() < 0.35) e.disturb(ball.y + (Math.random() - 0.5) * 40, 0.6 + Math.random() * 0.8, 50);
        const surface = ball.side === "L" ? edgeL.rest : W - edgeR.rest;
        const xTarget = ball.side === "L" ? surface + BASE_R * 1.5 : surface - BASE_R * 1.5;
        ball.x = surface + (xTarget - surface) * easeOutCubic(u);
        ball.r = BASE_R * (0.35 + 0.65 * easeOutCubic(u));
        ball.neckStrength = u < 0.82 ? 1 : Math.max(0, 1 - (u - 0.82) / 0.18);
        if (Math.random() < 0.18 && u < 0.7) {
          const sx = ball.side === "L" ? edgeL.rest + Math.random() * 8 : W - edgeR.rest - Math.random() * 8;
          spawnDroplet(sx, ball.y + (Math.random() - 0.5) * BASE_R * 1.2, (ball.side === "L" ? 1 : -1) * Math.random() * 0.05, (Math.random() - 0.5) * 0.05, 2 + Math.random() * 3, 350 + Math.random() * 200);
        }
        if (u >= 1) beginLaunch();
      } else if (ball.phase === "fly") {
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        ball.vx *= 1.004;
        ball.stretch = 1 + Math.min(1.2, Math.abs(ball.vx) * 0.9);
        const lx = edgeL.rest + ball.r * 0.2;
        const rx = W - edgeR.rest - ball.r * 0.2;
        if ((ball.vx > 0 && ball.x >= rx) || (ball.vx < 0 && ball.x <= lx)) {
          ball.x = ball.vx > 0 ? rx : lx;
          beginImpact();
        }
      } else if (ball.phase === "impact") {
        const D = 260, u = Math.min(1, ball.t / D);
        ball.r = BASE_R * (1 - easeInCubic(u));
        if (ball.nextSide === "R") ball.x = Math.min(W - edgeR.rest * 0.5, ball.x + dt * 0.15);
        else                        ball.x = Math.max(edgeL.rest * 0.5,     ball.x - dt * 0.15);
        if (u >= 1) { ball.phase = "settle"; ball.t = 0; }
      } else if (ball.phase === "settle") {
        if (ball.t >= 1200) beginIdle();
      }
    }

    function drawBallInto(g: CanvasRenderingContext2D) {
      if (ball.phase === "idle" || ball.phase === "settle") return;
      if (ball.phase === "forming") {
        stampBlob(g, ball.x, ball.y, ball.r * 1.25, 1.0);
        const surfaceX = ball.side === "L" ? edgeL.rest : W - edgeR.rest;
        for (let i = 1; i <= 10; i++) {
          const t = i / 11;
          const nx = surfaceX + (ball.x - surfaceX) * t;
          const pinch = 1 - 0.55 * Math.sin(Math.PI * t);
          const nr = ball.r * 0.55 * pinch * Math.pow(ball.neckStrength, 1.6);
          if (nr > 1.5) stampBlob(g, nx, ball.y, nr, 1.0);
        }
        return;
      }
      if (ball.phase === "fly") {
        const speed = Math.hypot(ball.vx, ball.vy);
        const trail = Math.min(180, speed * 90);
        const dirx = ball.vx / (speed || 1);
        const diry = ball.vy / (speed || 1);
        for (let i = 0; i < 8; i++) {
          const t = i / 7;
          stampBlob(g, ball.x - dirx * trail * t, ball.y - diry * trail * t, ball.r * (1 - 0.55 * t) * 1.18, 1 - 0.25 * t);
        }
        return;
      }
      if (ball.phase === "impact" && ball.r > 2) stampBlob(g, ball.x, ball.y, ball.r * 1.3, 1.0);
    }

    function draw() {
      const dark = darkModeRef.current;
      bctx!.clearRect(0, 0, W, H);
      bctx!.globalCompositeOperation = "source-over";
      edgeL.stamp(bctx!);
      edgeR.stamp(bctx!);
      stampDroplets(bctx!);
      drawBallInto(bctx!);

      const img = bctx!.getImageData(0, 0, buf.width, buf.height);
      const data = img.data;
      const TH = 108, TH2 = TH + 22;
      for (let i = 3; i < data.length; i += 4) {
        const a = data[i];
        if (a >= TH2)     data[i] = 255;
        else if (a <= TH) data[i] = 0;
        else              data[i] = Math.round(((a - TH) / (TH2 - TH)) * 255);
        if (dark) { data[i-3] = 255; data[i-2] = 255; data[i-1] = 255; }
        else      { data[i-3] = 0;   data[i-2] = 0;   data[i-1] = 0;   }
      }
      bctx!.putImageData(img, 0, 0);

      ctx!.fillStyle = dark ? "#0a0a0a" : "#ffffff";
      ctx!.fillRect(0, 0, W, H);
      ctx!.save();
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.drawImage(buf, 0, 0);
      ctx!.restore();
    }

    let last = performance.now();
    function frame(now: number) {
      const dt = Math.min(48, now - last);
      last = now;
      update(dt);
      draw();
      animId = requestAnimationFrame(frame);
    }

    window.addEventListener("resize", resize);
    resize();
    ball.nextSide = Math.random() < 0.5 ? "L" : "R";
    beginIdle();
    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 hidden md:block"
      style={{ width: "100vw", height: "100vh", zIndex: 0, pointerEvents: "none" }}
    />
  );
}
