import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const html = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");

test("shared HTML initializes GTM once, asynchronously, preserving existing data", () => {
  const snippets = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .filter(match => match[1].includes("GTM-NBZDWMZF"));
  assert.equal(snippets.length, 1);
  assert(html.indexOf(snippets[0][0]) < html.indexOf("</head>"));
  const existing = { event: "existing" };
  const window = { dataLayer: [existing] };
  const inserted = [];
  const firstScript = { parentNode: { insertBefore(node, before) {
    assert.equal(before, firstScript);
    inserted.push(node);
  } } };
  const document = {
    getElementsByTagName: () => [firstScript],
    createElement: tag => {
      assert.equal(tag, "script");
      return {};
    },
  };
  runInNewContext(snippets[0][1], { window, document });
  assert.equal(window.dataLayer[0], existing);
  assert.equal(window.dataLayer[1].event, "gtm.js");
  assert.equal(typeof window.dataLayer[1]["gtm.start"], "number");
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0].async, true);
  assert.equal(inserted[0].src, "https://www.googletagmanager.com/gtm.js?id=GTM-NBZDWMZF");
});

test("GTM no-JavaScript fallback is the first body element", () => {
  assert.match(html, /<body>\s*<!-- Google Tag Manager \(noscript\) -->\s*<noscript><iframe src="https:\/\/www\.googletagmanager\.com\/ns\.html\?id=GTM-NBZDWMZF"/);
  assert.equal((html.match(/ns\.html\?id=GTM-NBZDWMZF/g) || []).length, 1);
});
