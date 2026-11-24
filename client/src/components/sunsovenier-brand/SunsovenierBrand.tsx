import type { ReactNode } from "react";
import "./sunsovenier-brand.css";

export type SunsovenierBrandProps = {
  logo?: ReactNode;
  className?: string;
};

export default function SunsovenierBrand({ logo, className = "" }: SunsovenierBrandProps) {
  const rootClassName = ["sunsovenier-brand", className].filter(Boolean).join(" ");

  return (
    <span className={rootClassName} dir="ltr">
      {logo != null && <span className="sunsovenier-brand__logo">{logo}</span>}
      <span className="sunsovenier-brand__name">
        <span className="sunsovenier-brand__sun">Sun</span>
        <span className="sunsovenier-brand__suffix">sovenier</span>
      </span>
    </span>
  );
}
