import { useEffect, useRef } from 'react';

/** Audio-reactive waveform drawn at runtime; no image asset is used. */
export default function AudioWaveform({ active, level = 0, className = '' }) {
  const canvasRef = useRef(null);
  const levelRef = useRef(level);

  useEffect(() => { levelRef.current = level; }, [level]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;

    let frame = 0;
    let lastDraw = 0;
    let width = 0;
    let height = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const draw = now => {
      frame = requestAnimationFrame(draw);
      if (now - lastDraw < 32 || !width || !height) return;
      lastDraw = now;

      const time = reducedMotion.matches ? 0 : now / 1000;
      const input = Math.min(1, Math.max(0, levelRef.current));
      const ambient = active ? 0.04 : 0.55 + (reducedMotion.matches ? 0 : 0.06 * Math.sin(time * 1.6));
      const energy = Math.min(1, Math.max(ambient, input * 1.8));
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width * 0.47, 390);
      const baseAmplitude = 7 + energy * Math.min(82, height * 0.32);

      context.clearRect(0, 0, width, height);

      // Mirrored equalizer bars behind the main voice wave.
      const barCount = 23;
      const barGap = (radius * 1.55) / barCount;
      for (let i = 0; i < barCount; i++) {
        const position = (i / (barCount - 1)) * 2 - 1;
        const envelope = Math.exp(-Math.pow((Math.abs(position) - 0.65) * 4, 2));
        const pulse = 0.28 + 0.72 * Math.abs(Math.sin(i * 0.39 + time * (active ? 5 : 1.1)));
        const barHeight = 4 + (35 + energy * 85) * envelope * pulse;
        const x = centerX + position * radius * 0.76;
        context.fillStyle = `rgba(255, 143, 162, ${0.22 + envelope * 0.5})`;
        for (let y = 4; y < barHeight; y += 7) {
          context.fillRect(x - barGap * 0.34, centerY - y - 4, barGap * 0.68, 4);
          context.globalAlpha = 0.2 * (1 - y / barHeight);
          context.fillRect(x - barGap * 0.34, centerY + y, barGap * 0.68, 4);
          context.globalAlpha = 1;
        }
        context.globalAlpha = 1;
      }

      const displacement = (x, phase) => {
        const normalized = (x - centerX) / radius;
        const envelope = Math.exp(-Math.abs(normalized) * 3.4);
        const carrier = 0.18 + Math.pow(Math.cos(normalized * 10 + Math.sin(time * 1.2 + phase) * 0.35 + phase), 2);
        return carrier * envelope * baseAmplitude;

      };

      context.save();
      context.shadowColor = 'rgba(255, 150, 174, 0.9)';
      context.shadowBlur = 20;
      const fill = context.createLinearGradient(0, centerY - baseAmplitude, 0, centerY + baseAmplitude);
      fill.addColorStop(0, 'rgba(255, 197, 203, 0.06)');
      fill.addColorStop(0.5, 'rgba(255, 184, 196, 0.8)');
      fill.addColorStop(1, 'rgba(255, 197, 203, 0.06)');
      context.beginPath();
      for (let x = centerX - radius; x <= centerX + radius; x += 3) {
        const y = centerY + displacement(x, 0);
        if (x === centerX - radius) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      for (let x = centerX + radius; x >= centerX - radius; x -= 3) {
        context.lineTo(x, centerY - displacement(x, 0));
      }
      context.closePath();
      context.fillStyle = fill;
      context.fill();
      context.lineWidth = 1.5;
      context.strokeStyle = 'rgba(255, 213, 219, 0.92)';
      context.stroke();
      // A second translucent ribbon gives the waveform its layered silhouette.
      context.beginPath();
      for (let i = 0; i <= 180; i++) {
        const x = centerX - radius + i / 180 * radius * 2;
        const y = centerY - displacement(x, 0.55) * 0.6;
        if (!i) context.moveTo(x, y); else context.lineTo(x, y);
      }
      for (let i = 180; i >= 0; i--) {
        const x = centerX - radius + i / 180 * radius * 2;
        context.lineTo(x, centerY + displacement(x, 0.55) * 0.6);
      }
      context.closePath();
      context.fill();
      context.stroke();
      context.beginPath();
      context.moveTo(centerX - radius, centerY);
      context.lineTo(centerX + radius, centerY);
      context.lineWidth = 0.6;
      context.stroke();
      context.restore();

      const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.72);
      glow.addColorStop(0, `rgba(255, 166, 186, ${0.16 + energy * 0.15})`);
      glow.addColorStop(1, 'rgba(255, 166, 186, 0)');
      context.fillStyle = glow;
      context.fillRect(centerX - radius * 0.72, centerY - height / 2, radius * 1.44, height);
    };

    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [active]);

  return (
    <div className={`audio-waveform ${className}`} role="img" aria-label={active ? 'Animated waveform reacting to interview audio' : 'Animated audio waveform'}>
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}
