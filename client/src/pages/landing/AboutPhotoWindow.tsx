import { useEffect, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { usePhotoWindowEffects } from "./usePhotoWindowEffects";
import "./about-window.css";

type AboutPhotoWindowProps = {
  label: string;
  images: Array<{ src: string; alt: string }>;
  soundLabels: { mute: string; unmute: string };
};

export default function AboutPhotoWindow({
  label,
  images,
  soundLabels,
}: AboutPhotoWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const { soundEnabled, toggleSound, playTick, tilt, resetTilt } = usePhotoWindowEffects();

  useEffect(() => {
    const photoWindow = windowRef.current;
    if (!photoWindow) return;

    if (!("IntersectionObserver" in window)) {
      photoWindow.classList.add("is-in-view");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        photoWindow.classList.toggle("is-in-view", entry.isIntersecting);
      },
      { threshold: 0.08 },
    );

    observer.observe(photoWindow);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={windowRef}
      className="mc-about-window"
      role="group"
      aria-label={label}
      onPointerMove={tilt}
      onPointerLeave={resetTilt}
    >
      <div className="mc-about-window__panes" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => {
          const image = images[index];

          return (
            <div
              className={`mc-about-window__pane mc-about-window__pane--${index + 1}`}
              key={image?.src ?? `pane-${index}`}
              onPointerEnter={playTick}
            >
              {image && (
                <img
                  src={image.src}
                  alt=""
                  draggable="false"
                  loading="lazy"
                  decoding="async"
                />
              )}
            </div>
          );
        })}
      </div>
      <button type="button" className="mc-about-window__sound" data-testid="about-window-sound"
        onClick={toggleSound} aria-pressed={soundEnabled}
        aria-label={soundEnabled ? soundLabels.mute : soundLabels.unmute}
        title={soundEnabled ? soundLabels.mute : soundLabels.unmute}>
        {soundEnabled ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
      </button>
    </div>
  );
}
