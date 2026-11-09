import { useEffect, useRef } from "react";
import { usePhotoWindowEffects } from "./usePhotoWindowEffects";
import "./about-window.css";

type AboutPhotoWindowProps = {
  label: string;
  image: { src: string; alt: string };
};

export default function AboutPhotoWindow({
  label,
  image,
}: AboutPhotoWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const { playTick, tilt, resetTilt } = usePhotoWindowEffects();

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
      aria-label={image.alt || label}
      onPointerMove={tilt}
      onPointerLeave={resetTilt}
    >
      <div className="mc-about-window__panes" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <div
            className={`mc-about-window__pane mc-about-window__pane--${index + 1}`}
            key={`${image.src}-${index}`}
            onPointerEnter={playTick}
          >
            <img
              src={image.src}
              alt=""
              draggable="false"
              loading="lazy"
              decoding="async"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
