import { createRoot } from "react-dom/client";
import "./index.css";
import { registerServiceWorker } from "./lib/registerSW";

const root = createRoot(document.getElementById("root")!);

root.render(
  <main role="status" aria-live="polite" style={{ minHeight: "100vh", display: "grid", placeContent: "center", padding: 24, textAlign: "center", fontFamily: "system-ui, sans-serif", color: "#19222e", background: "#f4f6f9" }}>
    <p>Loading Momtazchem…</p>
    <p dir="rtl" lang="ar">جارٍ تحميل الموقع…</p>
  </main>,
);

function showStartupError(error: unknown) {
  console.error("[App] Startup failed:", error);
  root.render(
    <main role="alert" style={{ minHeight: "100vh", display: "grid", placeContent: "center", padding: 24, textAlign: "center", fontFamily: "system-ui, sans-serif", color: "#19222e", background: "#f4f6f9" }}>
      <h1 style={{ fontSize: 22 }}>The site could not finish loading</h1>
      <p dir="rtl">بارگذاری سایت کامل نشد؛ اتصال اینترنت را بررسی کنید.</p>
      <p>Please check your connection and try again.</p>
      <button type="button" onClick={() => window.location.reload()} style={{ padding: "12px 24px", border: 0, borderRadius: 12, background: "#1a56db", color: "white", cursor: "pointer" }}>
        تلاش مجدد / Retry
      </button>
    </main>,
  );
}

if (window.location.pathname === "/delivery") {
  import("./DeliveryApp").then(({ default: DeliveryApp }) => {
    root.render(<DeliveryApp />);
  }).catch(showStartupError);
} else {
  import("./App").then(({ default: App }) => {
    root.render(<App />);
  }).catch(showStartupError);
}

registerServiceWorker();
console.log("CI_CD_TEST_2026");
