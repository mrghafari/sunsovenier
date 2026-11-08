import { useEffect } from "react";

/**
 * Landing-only motion orchestration. Reveal state is attached to elements, so
 * CMS block insertion and reordering do not depend on a fixed page structure.
 */
export function useLandingMotion(contentRevision?: string | number) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".mc-landing");
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const mobileViewport = window.matchMedia("(max-width: 767px)");
    const hero = root.querySelector<HTMLElement>(".mc-hero");
    const revealSelector = ".mc-reveal";
    let revealObserver: IntersectionObserver | null = null;
    let heroObserver: IntersectionObserver | null = null;
    let frame = 0;
    let heroInView = false;

    const showAll = () => {
      root.querySelectorAll<HTMLElement>(revealSelector).forEach((node) => {
        node.classList.add("is-visible");
      });
    };

    const observeReveals = (scope: ParentNode = root) => {
      const nodes = scope.querySelectorAll<HTMLElement>(revealSelector);
      nodes.forEach((node) => {
        if (reducedMotion.matches || !("IntersectionObserver" in window)) {
          node.classList.add("is-visible");
          return;
        }
        if (node.classList.contains("is-visible")) return;
        if (node.contains(document.activeElement)) {
          node.classList.add("is-visible");
          return;
        }
        revealObserver?.observe(node);
      });
    };

    const clearFrame = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };

    const canTrackScroll = () =>
      Boolean(hero && heroInView && !reducedMotion.matches && !coarsePointer.matches &&
        !mobileViewport.matches &&
        document.visibilityState === "visible");

    const updateDepth = () => {
      frame = 0;
      if (!canTrackScroll() || !hero) return;
      const bounds = hero.getBoundingClientRect();
      const progress = Math.max(-1, Math.min(1, (window.innerHeight - bounds.top) /
        (window.innerHeight + bounds.height) - 0.5));
      hero.style.setProperty("--mc-parallax-y", `${(-progress * 17).toFixed(1)}px`);
    };

    const scheduleDepth = () => {
      if (!canTrackScroll() || frame) return;
      frame = window.requestAnimationFrame(updateDepth);
    };

    const syncMotionMode = () => {
      clearFrame();
      if (reducedMotion.matches) {
        root.classList.remove("mc-motion-ready");
        hero?.classList.remove("is-motion-active");
        hero?.style.removeProperty("--mc-parallax-y");
        showAll();
        return;
      }

      root.classList.add("mc-motion-ready");
      if (heroInView) hero?.classList.add("is-motion-active");
      else hero?.classList.remove("is-motion-active");
      if (coarsePointer.matches || mobileViewport.matches) hero?.style.removeProperty("--mc-parallax-y");
      else scheduleDepth();
    };

    if ("IntersectionObserver" in window) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("is-visible");
            revealObserver?.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -32px 0px" });
      observeReveals();

      if (hero) {
        heroObserver = new IntersectionObserver(([entry]) => {
          heroInView = Boolean(entry?.isIntersecting);
          hero?.classList.toggle("is-motion-active", heroInView && !reducedMotion.matches);
          if (heroInView) scheduleDepth();
          else {
            clearFrame();
            hero?.style.removeProperty("--mc-parallax-y");
          }
        }, { threshold: 0 });
        heroObserver.observe(hero);
      }
    } else {
      showAll();
    }

    const mutationObserver = "MutationObserver" in window
      ? new MutationObserver((records) => {
          records.forEach((record) => record.addedNodes.forEach((added) => {
            if (added instanceof HTMLElement) {
              if (added.matches(revealSelector)) observeReveals(added.parentElement ?? root);
              else observeReveals(added);
            }
          }));
        })
      : null;
    mutationObserver?.observe(root, { childList: true, subtree: true });

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        clearFrame();
        hero?.classList.remove("is-motion-active");
      } else {
        hero?.classList.toggle("is-motion-active", heroInView && !reducedMotion.matches);
        scheduleDepth();
      }
    };
    const onScroll = () => scheduleDepth();
    const onResize = () => scheduleDepth();
    const onFocusIn = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLElement)) return;
      let node: HTMLElement | null = event.target;
      while (node && node !== root) {
        if (node.matches(revealSelector)) {
          node.classList.add("is-visible");
          revealObserver?.unobserve(node);
        }
        node = node.parentElement;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    root.addEventListener("focusin", onFocusIn);
    reducedMotion.addEventListener?.("change", syncMotionMode);
    coarsePointer.addEventListener?.("change", syncMotionMode);
    mobileViewport.addEventListener?.("change", syncMotionMode);
    syncMotionMode();

    return () => {
      clearFrame();
      revealObserver?.disconnect();
      heroObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      root.removeEventListener("focusin", onFocusIn);
      reducedMotion.removeEventListener?.("change", syncMotionMode);
      coarsePointer.removeEventListener?.("change", syncMotionMode);
      mobileViewport.removeEventListener?.("change", syncMotionMode);
      root.classList.remove("mc-motion-ready");
      hero?.classList.remove("is-motion-active");
      hero?.style.removeProperty("--mc-parallax-y");
    };
  }, [contentRevision]);
}
