import { useEffect, useRef } from "react";

interface Candle {
  x: number;
  open: number;
  close: number;
  high: number;
  low: number;
  w: number;
  isGreen: boolean;
}

interface Wave {
  candles: Candle[];
  scrollX: number;
  baseY: number;
  speed: number;
  opacity: number;
}

export default function CandleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let waves: Wave[] = [];
    let gridOffset = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initWaves();
    };
    resize();
    window.addEventListener("resize", resize);

    // Generate a clean uptrend candle sequence
    const generateCandles = (count: number, startX: number, baseY: number, spacing: number): Candle[] => {
      const result: Candle[] = [];
      let price = 0;

      for (let i = 0; i < count; i++) {
        const progress = i / count;
        // Uptrend: price generally rises with small pullbacks
        const trendForce = progress * 120; // overall upward drift
        const noise = Math.sin(progress * Math.PI * 6) * 15 + Math.sin(progress * Math.PI * 14) * 8;
        const basePrice = price + trendForce + noise;

        // 72% green candles
        const isGreen = Math.random() > 0.28;
        const bodyH = 10 + Math.random() * 25;
        const wickH = 4 + Math.random() * 10;

        const open = basePrice;
        const close = isGreen ? open - bodyH : open + bodyH * 0.5;
        const high = Math.min(open, close) - wickH * (0.3 + Math.random() * 0.5);
        const low = Math.max(open, close) + wickH * (0.4 + Math.random() * 0.6);

        result.push({
          x: startX + i * spacing,
          open: baseY + open,
          close: baseY + close,
          high: baseY + high,
          low: baseY + low,
          w: 2 + Math.random() * 2.5,
          isGreen,
        });

        price = close;
      }

      return result;
    };

    const initWaves = () => {
      waves = [];
      const spacing = 12;
      const candleCount = Math.ceil(canvas.width / spacing) + 30;

      // Wave 1: lower, slowest
      waves.push({
        candles: generateCandles(candleCount, 0, canvas.height * 0.82, spacing),
        scrollX: 0,
        baseY: canvas.height * 0.82,
        speed: 0.25,
        opacity: 0.035,
      });

      // Wave 2: middle
      waves.push({
        candles: generateCandles(candleCount, 0, canvas.height * 0.62, spacing),
        scrollX: 0,
        baseY: canvas.height * 0.62,
        speed: 0.4,
        opacity: 0.045,
      });

      // Wave 3: upper, fastest
      waves.push({
        candles: generateCandles(candleCount, 0, canvas.height * 0.42, spacing),
        scrollX: 0,
        baseY: canvas.height * 0.42,
        speed: 0.55,
        opacity: 0.035,
      });
    };
    initWaves();

    const drawGrid = () => {
      const gridSize = 80;
      ctx.strokeStyle = "rgba(201, 168, 76, 0.02)";
      ctx.lineWidth = 0.5;

      // Vertical
      for (let x = gridOffset % gridSize; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Horizontal
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    };

    const drawCandle = (c: Candle, opacity: number) => {
      const color = c.isGreen ? "#22c55e" : "#ef4444";
      const cx = c.x;

      // Wick
      ctx.beginPath();
      ctx.moveTo(cx, c.high);
      ctx.lineTo(cx, c.low);
      ctx.strokeStyle = color;
      ctx.globalAlpha = opacity * 0.5;
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // Body
      const top = Math.min(c.open, c.close);
      const bottom = Math.max(c.open, c.close);
      const h = Math.max(bottom - top, 1);

      ctx.fillStyle = color;
      ctx.globalAlpha = opacity;
      ctx.fillRect(cx - c.w / 2, top, c.w, h);

      // Subtle glow on green candles
      if (c.isGreen) {
        ctx.globalAlpha = opacity * 0.15;
        ctx.fillRect(cx - c.w * 1.5, top - 1, c.w * 3, h + 2);
      }

      ctx.globalAlpha = 1;
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Scroll grid slightly
      gridOffset -= 0.15;

      drawGrid();

      waves.forEach((wave) => {
        wave.scrollX -= wave.speed;

        // Draw candles with scroll offset
        wave.candles.forEach((c) => {
          const sx = c.x + wave.scrollX;

          // Recycle: if off left, move to right end
          if (sx < -30) {
            const maxX = Math.max(...wave.candles.map((cc) => cc.x));
            c.x = maxX + 12 + Math.random() * 3;
            // Regenerate this candle with uptrend continuation
            const lastCandle = wave.candles.reduce((prev, curr) =>
              curr.x > prev.x ? curr : prev
            , wave.candles[0]);
            const trendForce = 120;
            const noise = Math.sin(Date.now() * 0.001) * 10;
            const basePrice = (lastCandle.close - wave.baseY) + trendForce * 0.01 + noise;
            const isGreen = Math.random() > 0.28;
            const bodyH = 10 + Math.random() * 25;
            const wickH = 4 + Math.random() * 10;
            c.open = wave.baseY + basePrice;
            c.close = isGreen ? c.open - bodyH : c.open + bodyH * 0.5;
            c.high = Math.min(c.open, c.close) - wickH * 0.5;
            c.low = Math.max(c.open, c.close) + wickH * 0.7;
            c.isGreen = isGreen;
          }

          // Only draw if on screen
          if (sx >= -30 && sx <= canvas.width + 30) {
            drawCandle({ ...c, x: sx }, wave.opacity);
          }
        });
      });

      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 1 }}
    />
  );
}
