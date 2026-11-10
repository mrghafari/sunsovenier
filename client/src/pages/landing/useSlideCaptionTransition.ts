import { useEffect, useRef, useState } from "react";

type Caption = {
  key: string;
  eyebrow: string;
  title: string;
  description: string;
  visible: boolean;
};

/** Keep the outgoing words mounted until they fade away, then reveal the new copy. */
export function useSlideCaptionTransition(incoming: Caption) {
  const [caption, setCaption] = useState(incoming);
  const [phase, setPhase] = useState<"entering" | "leaving" | "visible">("entering");
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const firstRender = useRef(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    media.addEventListener("change", update);
    update();
    return () => media.removeEventListener("change", update);
  }, []);

  const { key, eyebrow, title, description, visible } = incoming;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let firstFrame = 0;
    let secondFrame = 0;
    const next = { key, eyebrow, title, description, visible };
    const reveal = () => {
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => setPhase("visible"));
      });
    };
    if (reducedMotion) {
      firstRender.current = false;
      setCaption(next);
      setPhase("visible");
    } else if (firstRender.current) {
      firstRender.current = false;
      reveal();
    } else {
      setPhase("leaving");
      // Allow the 320ms CSS fade to finish before replacing any words.
      timer = setTimeout(() => {
        setCaption(next);
        setPhase("entering");
        reveal();
      }, 360);
    }
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [key, eyebrow, title, description, visible, reducedMotion]);

  return { caption, phase };
}
