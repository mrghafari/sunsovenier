import { createRoot } from "react-dom/client";
import "./index.css";
import { registerServiceWorker } from "./lib/registerSW";

const root = createRoot(document.getElementById("root")!);

if (window.location.pathname === "/delivery") {
  import("./DeliveryApp").then(({ default: DeliveryApp }) => {
    root.render(<DeliveryApp />);
  });
} else {
  import("./App").then(({ default: App }) => {
    root.render(<App />);
  });
}

registerServiceWorker();
console.log("CI_CD_TEST_2026");
