import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer";

const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const output = "generated-artifacts/landing-about-verification";
const browser = await puppeteer.launch({
  executablePath: execFileSync("bash", ["-c", "command -v chromium || command -v chromium-browser"], { encoding: "utf8" }).trim(),
  headless: true, args: ["--no-sandbox"],
});
const errors = [];
try {
  await mkdir(output, { recursive: true });
  for (const [language, width] of [["en",1440],["fa",1440],["ar",1440],["tr",1440],["fa",390]]) {
    const page = await browser.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.setBypassServiceWorker(true);
    await page.setViewport({ width, height: 1000 });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    if (language === "en" && width === 1440) {
      await page.evaluateOnNewDocument(() => {
        const NativeAudio = window.AudioContext;
        const probe = { contexts: [], starts: 0 };
        window.__windowAudioProbe = probe;
        window.AudioContext = class extends NativeAudio {
          constructor(...args) { super(...args); probe.contexts.push(this); }
          createOscillator() {
            const oscillator = super.createOscillator();
            const start = oscillator.start.bind(oscillator);
            oscillator.start = (...args) => { probe.starts++; return start(...args); };
            return oscillator;
          }
        };
      });
    }
    await page.evaluateOnNewDocument(language => {
      localStorage.setItem("language", language);
      localStorage.setItem("language-manually-selected", "true");
    }, language);
    await page.goto(base + "/", { waitUntil: "networkidle0", timeout: 60000 });
    await page.waitForFunction(() => document.querySelector(".mc-about-window"));
    await page.$eval("#about", node => node.scrollIntoView({ behavior: "instant", block: "start" }));
    const result = await page.evaluate(() => {
      const photoWindow = document.querySelector(".mc-about-window");
      const bounds = photoWindow.getBoundingClientRect();
      const panes = photoWindow.querySelectorAll(".mc-about-window__pane img");
      const grid = getComputedStyle(photoWindow.querySelector(".mc-about-window__panes"));
      return {
        label: photoWindow.getAttribute("aria-label"),
        dir: document.querySelector(".mc-landing").dir,
        facts: document.querySelectorAll(".mc-about-facts li").length,
        photo: Boolean(document.querySelector(".mc-about-image img")),
        overflow: document.documentElement.scrollWidth > innerWidth,
        paneCount: panes.length,
        animations: [...panes].every(node => getComputedStyle(node).animationName === "none"),
        aspectRatio: bounds.width / bounds.height,
        columns: grid.gridTemplateColumns.split(" ").length,
        rows: grid.gridTemplateRows.split(" ").length,
        sources: [...panes].map(node => node.getAttribute("src")),
        crops: [...panes].map(node => {
          const rect = node.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        }),
        aboutLink: document.querySelector(".mc-about-copy .mc-button").textContent,
        backgrounds: [photoWindow, photoWindow.parentElement, photoWindow.querySelector(".mc-about-window__panes")].map(node => getComputedStyle(node).backgroundColor),
        shadow: getComputedStyle(photoWindow).boxShadow,
      };
    });
    assert.equal(result.dir, ["fa","ar"].includes(language) ? "rtl" : "ltr");
    assert.equal(result.facts, 3);
    assert.equal(result.photo, false);
    assert.equal(result.overflow, false);
    assert.equal(result.paneCount, 4);
    assert.equal(result.columns, 2);
    assert.equal(result.rows, 2);
    assert.ok(Math.abs(result.aspectRatio - 560 / 440) < .01, "Window must keep the replaced illustration's overall proportions");
    assert.equal(new Set(result.sources).size, 1, "All four panes must show portions of one image");
    for (const crop of result.crops) {
      for (const key of ["x", "y", "width", "height"]) {
        assert.ok(Math.abs(crop[key] - result.crops[0][key]) < 1, `Image crop ${key} must align across all panes, including RTL`);
      }
    }
    assert.equal(result.aboutLink, { en: "About Us", fa: "درباره ما", ar: "من نحن", tr: "Hakkımızda" }[language]);
    assert.ok(result.sources.every(src => src.startsWith("/api/landing-") || src.startsWith("https://")));
    assert.ok(result.label.length > 30 && result.animations);
    assert.ok(result.backgrounds.every(color => color === "rgba(0, 0, 0, 0)"), "No blue backdrop or frame");
    assert.notEqual(result.shadow, "none");
    await page.waitForFunction(() => [...document.querySelectorAll(".mc-about-window__pane img")].every(img => img.complete && img.naturalWidth > 0));
    if (language === "fa" || language === "en") {
      await page.$eval("#about", node => node.scrollIntoView({ behavior: "instant", block: "start" }));
      await page.screenshot({ path: `${output}/${language}-${width}.jpg`, type: "jpeg", quality: 75 });
    }
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
    await page.$eval(".mc-about-window", node => node.scrollIntoView({ behavior: "instant", block: "center" }));
    await page.waitForFunction(() => document.querySelector(".mc-about-window")?.classList.contains("is-in-view"));
    const transform = () => page.$eval(".mc-about-window__pane--2 img", node => getComputedStyle(node).transform);
    const before = await transform();
    await new Promise(resolve => setTimeout(resolve, 400));
    assert.notEqual(await transform(), before, "Window photos must actually move");
    if (language === "en" && width === 1440) {
      const hover = async index => {
        const node = await page.$(`.mc-about-window__pane--${index}`);
        const box = await node.boundingBox();
        await page.mouse.move(box.x + box.width * .65, box.y + box.height * .55);
        await new Promise(resolve => setTimeout(resolve, 260));
      };
      const starts = () => page.evaluate(() => window.__windowAudioProbe.starts);
      await hover(1);
      assert.equal(await starts(), 0, "Hover must not autoplay before a trusted gesture");
      await page.click(".mc-about-copy h2");
      await page.waitForFunction(() => window.__windowAudioProbe.contexts.some(context => context.state === "running"));
      const baseline = await starts();
      await hover(1); await hover(2);
      assert.ok(await starts() >= baseline + 2, JSON.stringify({
        message: "Actual Web Audio tick starts on each pane entry",
        baseline, starts: await starts(), errors,
        audio: await page.evaluate(() => ({ states: window.__windowAudioProbe.contexts.map(context => context.state), fine: matchMedia("(hover: hover) and (pointer: fine)").matches })),
      }));
      assert.notEqual(await page.$eval(".mc-about-window", node => node.style.getPropertyValue("--mc-window-rotate-y")), "");
      assert.equal(await page.$('[data-testid="about-window-sound"]'), null, "No speaker button overlays the image");
      console.log("PASS depth/audio: transparent background, pointer tilt, real tick synthesis after gesture, no speaker overlay.");
    }
    // A collapsed quote makes the About image visible at the top on tall phones.
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
    await page.waitForFunction(() => !document.querySelector(".mc-about-window")?.classList.contains("is-in-view"));
    assert.equal(await page.$eval(".mc-about-window__pane img", node => getComputedStyle(node).animationPlayState), "paused");
    await page.close();
    console.log(`PASS About ${language} ${width}px: one continuous image, aligned 2×2 window, About Us label, motion, offscreen pausing and reduced motion.`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
