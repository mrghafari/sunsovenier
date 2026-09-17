---
name: Multi-date-picker module interop
description: Covers the production module-shape incompatibility of react-multi-date-picker in this project.
---

Treat the outer `react-multi-date-picker` module object as a compatibility wrapper, not as a React component. Resolve its inner default export before rendering and verify the resolved value is a valid React element type.

**Why:** In the production bundle, a normal default import resolved to the outer module object. Rendering it caused minified React error 130 and a blank page only when the Persian date-picker branch became active. The inner default is a valid `forwardRef` component.

**How to apply:** Any new use of this package should reuse the normalized component approach or confirm the bundler now resolves the default import to a valid React element type before simplifying it.