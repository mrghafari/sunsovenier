import { useEffect, useRef, useState, type PointerEvent } from "react";

/** Local-only hover effects: no audio files, autoplay, or work on every React render. */
export function usePhotoWindowEffects() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const enabled = useRef(soundEnabled);
  enabled.current = soundEnabled;
  const audio = useRef<AudioContext | null>(null);
  const lastTick = useRef(-Infinity);
  const animationFrame = useRef(0);

  useEffect(() => {
    const unlock = () => {
      if (!enabled.current || typeof window.AudioContext !== "function") return;
      try {
        audio.current ??= new window.AudioContext();
        if (audio.current.state === "suspended") {
          void audio.current.resume().catch(() => {
            console.warn("[Landing window] Hover audio awaits browser permission.");
          });
        }
      } catch {
        console.warn("[Landing window] Hover audio is unavailable in this browser.");
      }
    };
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
    return () => {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
      if (audio.current) {
        void audio.current.close().catch(() => undefined);
        audio.current = null;
      }
    };
  }, []);

  // Use the actual event: a connected mouse can coexist with a coarse primary pointer.
  const fineMouse = (event: PointerEvent<HTMLDivElement>) => event.pointerType === "mouse";

  const playTick = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled.current || !fineMouse(event)) return;
    const context = audio.current;
    if (!context || context.state !== "running") return;
    const time = performance.now();
    if (time - lastTick.current < 120) return;
    lastTick.current = time;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    const start = context.currentTime;
    oscillator.frequency.setValueAtTime(1700, start);
    oscillator.frequency.exponentialRampToValueAtTime(650, start + .025);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(.035, start + .003);
    gain.gain.exponentialRampToValueAtTime(.0001, start + .035);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(start);
    oscillator.stop(start + .04);
  };

  const tilt = (event: PointerEvent<HTMLDivElement>) => {
    if (!fineMouse(event) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const x = Math.max(-.5, Math.min(.5, (event.clientX - rect.left) / rect.width - .5));
    const y = Math.max(-.5, Math.min(.5, (event.clientY - rect.top) / rect.height - .5));
    if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    animationFrame.current = requestAnimationFrame(() => {
      element.style.setProperty("--mc-window-rotate-x", `${(-y * 8).toFixed(2)}deg`);
      element.style.setProperty("--mc-window-rotate-y", `${(x * 10).toFixed(2)}deg`);
      animationFrame.current = 0;
    });
  };

  const resetTilt = (event: PointerEvent<HTMLDivElement>) => {
    if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    animationFrame.current = 0;
    event.currentTarget.style.removeProperty("--mc-window-rotate-x");
    event.currentTarget.style.removeProperty("--mc-window-rotate-y");
  };

  return { soundEnabled, toggleSound: () => setSoundEnabled(value => !value), playTick, tilt, resetTilt };
}
