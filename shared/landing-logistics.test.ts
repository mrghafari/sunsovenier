import assert from "node:assert/strict";
import test from "node:test";
import { defaultLandingPageSettings, landingHeaderNavigation, logisticsNavigationLink } from "./landing-page-settings";

test("new and previously saved headers replace account with Logistics", () => {
  const defaults = defaultLandingPageSettings();
  assert.ok(defaults.navigation.some(link => link.href === "/logistics"));
  assert.ok(!defaults.navigation.some(link => link.id === "account"));
  const legacy = [
    { id: "shop", href: "/shop", labels: {}, isActive: true },
    { id: "account", href: "/customer/login", textKey: "navAccount", labels: { en: "Customer account" }, isActive: true },
  ];
  const resolved = landingHeaderNavigation(legacy);
  assert.deepEqual(resolved.map(link => link.href), ["/shop", "/logistics", "/vendor"]);
  assert.deepEqual(resolved[1].labels, logisticsNavigationLink().labels);
  assert.equal(legacy[1].href, "/customer/login");
  assert.equal(defaults.footerConnect.find(link => link.id === "account")?.href, "/customer/login");
  assert.equal(landingHeaderNavigation([...legacy, logisticsNavigationLink()]).filter(link => link.href === "/logistics").length, 1);
});

test("vendor access is restored for legacy content without duplicate links", () => {
  assert.equal(defaultLandingPageSettings().navigation.filter(link => link.href === "/vendor").length, 1);
  const legacy = [{ id: "shop", href: "/shop", labels: {}, isActive: true }];
  const restored = landingHeaderNavigation(legacy);
  assert.equal(restored.filter(link => link.href === "/vendor").length, 1);
  assert.equal(restored.find(link => link.href === "/vendor")?.labels.fa, "پنل فروشندگان");
  assert.equal(landingHeaderNavigation(restored).filter(link => link.href === "/vendor").length, 1);
  assert.equal(legacy.length, 1);
});
