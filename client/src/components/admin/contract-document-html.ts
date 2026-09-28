import type { ContractLanguage } from "./contract-date-picker";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] || character);

export function renderContractDocumentHtml(number: string, text: string, language: ContractLanguage, logoDataUrl: string) {
  if (!/^data:image\/(?:png|jpeg|gif);base64,[a-zA-Z0-9+/=]+$/.test(logoDataUrl)) {
    throw new Error("Invalid company logo image");
  }
  const direction = language === "fa" || language === "ar" ? "rtl" : "ltr";
  return `<!doctype html><html lang="${language}" dir="${direction}"><head><meta charset="utf-8"><title>${escapeHtml(number)}</title><style>
    @page{margin:18mm}
    body{font:15px/2 Tahoma,Arial,sans-serif;max-width:800px;margin:28px auto;padding:0 24px}
    header{direction:ltr;text-align:left;min-height:70px;margin-bottom:12px}
    header img{display:block;max-width:140px;max-height:65px;width:auto;height:auto;object-fit:contain}
    h1{margin:0 0 20px;font-size:22px}
    pre{white-space:pre-wrap;font:inherit}
    @media print{body{margin:0;max-width:none;padding:0}}
  </style></head><body><header><img src="${logoDataUrl}" alt="Company logo"></header><h1>${escapeHtml(number)}</h1><pre>${escapeHtml(text)}</pre></body></html>`;
}

export async function loadContractLogoDataUrl(configuredUrl: string | null | undefined, bundledLogoUrl: string): Promise<string> {
  for (const url of [configuredUrl?.trim(), bundledLogoUrl]) {
    if (!url) continue;
    try {
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok) continue;
      const image = await response.blob();
      if (!/^image\/(?:png|jpeg|gif)$/.test(image.type)) continue;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(image);
      });
      if (/^data:image\/(?:png|jpeg|gif);base64,[a-zA-Z0-9+/=]+$/.test(dataUrl)) return dataUrl;
    } catch {
      // The configured image can be inaccessible from the browser; try the bundled company logo.
    }
  }
  throw new Error("Company logo could not be loaded");
}