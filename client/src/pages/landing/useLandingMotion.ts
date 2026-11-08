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
    const mobileViewport = window.matchMedia("(max-width: 767px)");
    const hero = root.querySelector<HTMLElement>(".mc-hero");
    const heroDocumentTop = (hero?.getBoundingClientRect().top ?? 0) + window.scrollY;
    const revealSelector = ".mc-reveal";
    let revealObserver: IntersectionObserver | null = null;
    let heroObserver: IntersectionObserver | null = null;
    let frame = 0;
    const activeReveals = new Set<HTMLElement>();
    const initialHeroBounds = hero?.getBoundingClientRect();
    let heroInView = Boolean(initialHeroBounds &&
      initialHeroBounds.bottom > 0 && initialHeroBounds.top < window.innerHeight);
    if (heroInView) {
      root.querySelector<HTMLElement>(".mc-hero-copy")?.classList.add("is-visible");
    }

    const clamp = (value: number, min: number, max: number) =>
      Math.max(min, Math.min(max, value));

    const exposeReveal = (node: HTMLElement) => {
      node.classList.add("is-visible");
      node.dataset.revealProgress = "1.000";
      if (mobileViewport.matches || reducedMotion.matches) {
        node.style.removeProperty("--mc-reveal-progress");
        node.style.removeProperty("--mc-reveal-opacity");
        node.style.removeProperty("--mc-reveal-rise");
        node.style.removeProperty("--mc-reveal-scale");
        return;
      }
      node.style.setProperty("--mc-reveal-progress", "1");
      node.style.setProperty("--mc-reveal-opacity", "1");
      node.style.setProperty("--mc-reveal-rise", "0px");
      node.style.setProperty("--mc-reveal-scale", "1");
    };

    const setRevealProgress = (node: HTMLElement, progress: number) => {
      const value = clamp(progress, 0, 1);
      node.dataset.revealProgress = value.toFixed(3);
      node.style.setProperty("--mc-reveal-progress", value.toFixed(3));
      node.style.setProperty("--mc-reveal-opacity", (0.72 + value * 0.28).toFixed(3));
      node.style.setProperty("--mc-reveal-rise", `${((1 - value) * 56).toFixed(1)}px`);
      node.style.setProperty("--mc-reveal-scale", (0.98 + value * 0.02).toFixed(3));
      node.classList.toggle("is-visible", value >= 0.995);
    };

    // offsetTop follows layout boxes and excludes our visual transforms.
    const documentTop = (element: HTMLElement) => {
      let top = 0;
      let current: HTMLElement | null = element;
      while (current) {
        top += current.offsetTop;
        current = current.offsetParent as HTMLElement | null;
      }
      return top;
    };

    const progressFor = (node: HTMLElement) => {
      if (node.contains(document.activeElement)) return 1;
      const topInViewport = documentTop(node) - window.scrollY;
      const travel = Math.max(1, window.innerHeight * 0.5);
      return clamp((window.innerHeight - topInViewport) / travel, 0, 1);
    };

    const showAll = () => {
      root.querySelectorAll<HTMLElement>(revealSelector).forEach((node) => {
        exposeReveal(node);
      });
    };

    const clearRevealStyles = () => {
      activeReveals.clear();
      root.querySelectorAll<HTMLElement>(revealSelector).forEach((node) => {
        node.style.removeProperty("--mc-reveal-progress");
        node.style.removeProperty("--mc-reveal-opacity");
        node.style.removeProperty("--mc-reveal-rise");
        node.style.removeProperty("--mc-reveal-scale");
        delete node.dataset.revealProgress;
      });
    };

    const observeReveals = (scope: ParentNode = root) => {
      const nodes = scope.querySelectorAll<HTMLElement>(revealSelector);
      nodes.forEach((node) => {
        if (reducedMotion.matches || !("IntersectionObserver" in window)) {
          exposeReveal(node);
          return;
        }
        if (node.contains(document.activeElement)) {
          exposeReveal(node);
        }
        revealObserver?.observe(node);
      });
    };

    const clearFrame = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };

    const canTrackScroll = () =>
      Boolean(!reducedMotion.matches && !mobileViewport.matches &&
        (heroInView || activeReveals.size > 0) &&
        document.visibilityState === "visible");

    const updateDepth = () => {
      frame = 0;
      if (!canTrackScroll()) return;
      activeReveals.forEach((node) => setRevealProgress(node, progressFor(node)));
      if (hero && heroInView) {
        const bounds = hero.getBoundingClientRect();
        const progress = Math.max(-0.6, Math.min(0.72,
          (window.scrollY - Math.max(0, heroDocumentTop - 72)) / Math.max(1, bounds.height)));
        hero.style.setProperty("--mc-motion-progress", progress.toFixed(3));
        hero.style.setProperty("--mc-bg-offset", `${(-progress * 32).toFixed(1)}px`);
        hero.style.setProperty("--mc-copy-offset", `${(-progress * 68).toFixed(1)}px`);
        hero.style.setProperty("--mc-quote-offset", `${(-progress * 96).toFixed(1)}px`);
        hero.dataset.motionProgress = progress.toFixed(3);
      }
    };

    const scheduleDepth = () => {
      if (!canTrackScroll() || frame) return;
      frame = window.requestAnimationFrame(updateDepth);
    };

    const syncMotionMode = () => {
      clearFrame();
      if (reducedMotion.matches) {
        clearRevealStyles();
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

      if (mobileViewport.matches) {
        clearRevealStyles();
      }
      revealObserver?.disconnect();
      observeReveals();
      root.classList.add("mc-motion-ready");
      if (heroInView) hero?.classList.add("is-motion-active");
      else hero?.classList.remove("is-motion-active");
      if (mobileViewport.matches) {
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
          if (reducedMotion.matches) {
            activeReveals.delete(node);
            exposeReveal(node);
          } else if (mobileViewport.matches) {
            const focused = node.contains(document.activeElement);
            node.classList.toggle("is-visible", entry.isIntersecting || focused);
            node.dataset.revealProgress = entry.isIntersecting || focused ? "1.000" : "0.000";
            if (entry.isIntersecting) activeReveals.add(node);
            else activeReveals.delete(node);
          } else if (entry.isIntersecting) {
            activeReveals.add(node);
            setRevealProgress(node, progressFor(node));
          } else {
            activeReveals.delete(node);
          }
        });
        scheduleDepth();
      }, { threshold: 0, rootMargin: "0px 0px -20px 0px" });
      observeReveals();

      if (hero) {
        heroObserver = new IntersectionObserver(([entry]) => {
          heroInView = Boolean(entry?.isIntersecting);
          hero?.classList.toggle("is-motion-active", heroInView && !reducedMotion.matches);
          if (!heroInView) {
            clearFrame();
            hero?.style.removeProperty("--mc-motion-progress");
            hero?.style.removeProperty("--mc-bg-offset");
            hero?.style.removeProperty("--mc-copy-offset");
            hero?.style.removeProperty("--mc-quote-offset");
            if (hero) delete hero.dataset.motionProgress;
          }
          scheduleDepth();
        }, { threshold: 0 });
        heroObserver.observe(hero);
      }
    } else {
      showAll();
    }

    const mutationObserver = "MutationObserver" in window
      ? new MutationObserver((records) => {
          records.forEach((record) => {
            record.removedNodes.forEach((removed) => {
              if (!(removed instanceof HTMLElement)) return;
              const detached = [
                ...(removed.matches(revealSelector) ? [removed] : []),
                ...Array.from(removed.querySelectorAll<HTMLElement>(revealSelector)),
              ];
              detached.forEach((node) => {
                activeReveals.delete(node);
                revealObserver?.unobserve(node);
              });
            });
            record.addedNodes.forEach((added) => {
              if (!(added instanceof HTMLElement)) return;
              if (added.matches(revealSelector)) observeReveals(added.parentElement ?? root);
              else observeReveals(added);
            });
          });
          scheduleDepth();
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
          exposeReveal(node);
          activeReveals.add(node);
        }
        node = node.parentElement;
      }
      scheduleDepth();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    root.addEventListener("focusin", onFocusIn);
    reducedMotion.addEventListener?.("change", syncMotionMode);
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
      mobileViewport.removeEventListener?.("change", syncMotionMode);
      root.classList.remove("mc-motion-ready");
      hero?.classList.remove("is-motion-active");
      hero?.style.removeProperty("--mc-motion-progress");
      hero?.style.removeProperty("--mc-bg-offset");
      hero?.style.removeProperty("--mc-copy-offset");
      hero?.style.removeProperty("--mc-quote-offset");
      if (hero) delete hero.dataset.motionProgress;
      root.querySelectorAll<HTMLElement>(revealSelector).forEach((node) => {
        node.style.removeProperty("--mc-reveal-progress");
        node.style.removeProperty("--mc-reveal-opacity");
        node.style.removeProperty("--mc-reveal-rise");
        node.style.removeProperty("--mc-reveal-scale");
        delete node.dataset.revealProgress;
      });
    };
  }, [contentRevision]);
}
