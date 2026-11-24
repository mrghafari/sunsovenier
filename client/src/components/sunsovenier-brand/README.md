# Sunsovenier Brand

A small reusable React brand mark. **Sun** is yellow and **sovenier** is green.

## Preview

```bash
npm install
npm run dev
```

Open the local URL printed by Vite to view the responsive sample header.

## Use in a React app

Copy `SunsovenierBrand.tsx` and `sunsovenier-brand.css` into your project. The component accepts an optional React element for the logo, so the logo image can come from your own app:

```tsx
import SunsovenierBrand from "./SunsovenierBrand";

<SunsovenierBrand logo={<img src="/company-logo.png" alt="Company" />} />
```

The component keeps its text left-to-right and inherits the surrounding font size and text color. Its stylesheet defines the brand colors and spacing.
