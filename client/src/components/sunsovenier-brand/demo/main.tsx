import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SunsovenierBrand from "../SunsovenierBrand";
import "./demo.css";

const demoLogo = (
  <span className="demo-logo" aria-hidden="true">
    S
  </span>
);

const root = document.getElementById("root");
if (!root) {
  throw new Error("Demo root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <header className="demo-header">
      <SunsovenierBrand logo={demoLogo} />
    </header>
  </StrictMode>,
);
