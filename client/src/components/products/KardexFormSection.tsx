import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface KardexFormSectionProps {
  id: string;
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function KardexFormSection({
  id,
  title,
  children,
  icon,
  className = "",
}: KardexFormSectionProps) {
  return (
    <details
      data-testid={`kardex-section-${id}`}
      className={`rounded-lg border border-border bg-card text-card-foreground shadow-sm [&[open]>summary>svg]:rotate-180 ${className}`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200"
        />
      </summary>
      <div className="border-t border-border/80 p-3 sm:p-4">{children}</div>
    </details>
  );
}

export function revealKardexSectionForField(fieldName: string) {
  const sectionByField: Record<string, string> = {
    category: "basic",
    name: "basic",
    technicalName: "basic",
    description: "basic",
    specifications: "basic",
    features: "basic",
    applications: "basic",
    productLocalizations: "basic",
    vendorId: "basic",
    sku: "pricing",
    barcode: "pricing",
    unitPrice: "pricing",
    currency: "pricing",
    stockQuantity: "inventory",
    inventoryAddition: "inventory",
    newBatchNumber: "inventory",
    minStockLevel: "inventory",
    maxStockLevel: "inventory",
    netWeight: "inventory",
    grossWeight: "inventory",
    weightUnit: "inventory",
    packagingSpecifications: "packaging",
    tags: "display",
    syncWithShop: "display",
    showWhenOutOfStock: "display",
    displayMode: "media",
    imageUrl: "images",
    imageUrls: "images",
    model3dKey: "model3d",
    model3dFileName: "model3d",
    model3dUploadDate: "model3d",
    pdfCatalogUrl: "catalog",
    catalogFileName: "catalog",
    showCatalogToCustomers: "catalog",
    msdsUrl: "msds",
    msdsFileName: "msds",
    showMsdsToCustomers: "msds",
  };
  const sectionId = sectionByField[fieldName.split(".")[0]] ?? "basic";
  const target = document.querySelector<HTMLElement>(
    `[data-testid="kardex-section-${sectionId}"]`,
  );
  if (!target) return;

  const ancestors: HTMLDetailsElement[] = [];
  let current: HTMLElement | null = target;
  while (current) {
    if (current instanceof HTMLDetailsElement) ancestors.push(current);
    current = current.parentElement;
  }
  ancestors.reverse().forEach((section) => {
    section.open = true;
  });

  if (fieldName.split(".")[0] === "packagingSpecifications") {
    target.querySelectorAll<HTMLDetailsElement>(
      'details[data-testid="packaging-editor-panel"], details[data-testid^="packaging-section-"]',
    ).forEach(section => { section.open = true; });
  }

  requestAnimationFrame(() => {
    const field = document.querySelector<HTMLElement>(
      `[name="${CSS.escape(fieldName)}"]`,
    ) ?? target.querySelector<HTMLElement>(
      `[data-kardex-field="${CSS.escape(fieldName)}"] input:not([type="hidden"]), [data-kardex-field="${CSS.escape(fieldName)}"] textarea, [data-kardex-field="${CSS.escape(fieldName)}"] [role="combobox"]`,
    );
    if (field && !field.hasAttribute("disabled")) {
      field.focus({ preventScroll: false });
    } else {
      target.querySelector<HTMLElement>("summary")?.focus();
    }
  });
}
