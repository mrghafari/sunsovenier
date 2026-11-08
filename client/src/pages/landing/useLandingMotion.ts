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
    const heroDocumentTop = (hero?.getBoundingClientRect().top ?? 0) + window.scrollY;
    const revealSelector = ".mc-reveal";
    let revealObserver: IntersectionObserver | null = null;
    let heroObserver: IntersectionObserver | null = null;
    let frame = 0;
    const initialHeroBounds = hero?.getBoundingClientRect();
    let heroInView = Boolean(initialHeroBounds &&
      initialHeroBounds.bottom > 0 && initialHeroBounds.top < window.innerHeight);
    if (heroInView) {
      root.querySelector<HTMLElement>(".mc-hero-copy")?.classList.add("is-visible");
    }

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
        if (node.contains(document.activeElement)) {
          node.classList.add("is-visible");
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
      const progress = Math.max(-0.6, Math.min(0.72,
        (window.scrollY - Math.max(0, heroDocumentTop - 72)) / Math.max(1, bounds.height)));
      hero.style.setProperty("--mc-motion-progress", progress.toFixed(3));
      hero.style.setProperty("--mc-bg-offset", `${(-progress * 38).toFixed(1)}px`);
      hero.style.setProperty("--mc-copy-offset", `${(-progress * 68).toFixed(1)}px`);
      hero.style.setProperty("--mc-quote-offset", `${(-progress * 96).toFixed(1)}px`);
      hero.dataset.motionProgress = progress.toFixed(3);
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
        hero?.style.removeProperty("--mc-motion-progress");
        hero?.style.removeProperty("--mc-bg-offset");
        hero?.style.removeProperty("--mc-copy-offset");
        hero?.style.removeProperty("--mc-quote-offset");
        if (hero) delete hero.dataset.motionProgress;
        showAll();
        return;
      }

      root.classList.add("mc-motion-ready");
      if (heroInView) hero?.classList.add("is-motion-active");
      else hero?.classList.remove("is-motion-active");
      if (coarsePointer.matches || mobileViewport.matches) {
        hero?.style.removeProperty("--mc-motion-progress");
        hero?.style.removeProperty("--mc-bg-offset");
        hero?.style.removeProperty("--mc-copy-offset");
        hero?.style.removeProperty("--mc-quote-offset");
        if (hero) delete hero.dataset.motionProgress;
      }
      else scheduleDepth();
    };

    if ("IntersectionObserver" in window) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const node = entry.target as HTMLElement;
          if (reducedMotion.matches || node.contains(document.activeElement)) {
            node.classList.add("is-visible");
            node.dataset.revealProgress = "1";
          } else {
            if (!entry.isIntersecting) {
              node.dataset.revealExit = entry.boundingClientRect.top < 0 ? "above" : "below";
            }
            node.classList.toggle("is-visible", entry.isIntersecting);
            node.dataset.revealProgress = entry.isIntersecting ? "1" : "0";
          }
        });
      }, { threshold: 0.015, rootMargin: "0px 0px -20px 0px" });
      observeReveals();

      if (hero) {
        heroObserver = new IntersectionObserver(([entry]) => {
          heroInView = Boolean(entry?.isIntersecting);
          hero?.classList.toggle("is-motion-active", heroInView && !reducedMotion.matches);
          if (heroInView) scheduleDepth();
          else {
            clearFrame();
            hero?.style.removeProperty("--mc-motion-progress");
            hero?.style.removeProperty("--mc-bg-offset");
            hero?.style.removeProperty("--mc-copy-offset");
            hero?.style.removeProperty("--mc-quote-offset");
            if (hero) delete hero.dataset.motionProgress;
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
          node.dataset.revealProgress = "1";
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
      hero?.style.removeProperty("--mc-motion-progress");
      hero?.style.removeProperty("--mc-bg-offset");
      hero?.style.removeProperty("--mc-copy-offset");
      hero?.style.removeProperty("--mc-quote-offset");
      if (hero) delete hero.dataset.motionProgress;
    };
  }, [contentRevision]);
}
