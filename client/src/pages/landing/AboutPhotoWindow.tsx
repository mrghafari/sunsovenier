import { useEffect, useRef } from "react";
import "./about-window.css";

type AboutPhotoWindowProps = {
  label: string;
  images: Array<{ src: string; alt: string }>;
};

export default function AboutPhotoWindow({
  label,
  images,
}: AboutPhotoWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);

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
      role="img"
      aria-label={label}
    >
      <div className="mc-about-window__panes" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => {
          const image = images[index];

          return (
            <div
              className={`mc-about-window__pane mc-about-window__pane--${index + 1}`}
              key={image?.src ?? `pane-${index}`}
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
    </div>
  );
}
