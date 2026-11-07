import { Children, Fragment, isValidElement, type ReactNode, type CSSProperties } from "react";
import type { LandingLayout, LandingLayoutBlock } from "@shared/landing-layout";
import { localizedSetting, type LandingPageSettings } from "@shared/landing-page-settings";

type Locale = "en" | "fa" | "ar" | "tr";
export function LayoutElements({ order, children }: { order: readonly string[]; children: ReactNode }) {
  const nodes = Children.toArray(children);
  const byPart = new Map<string, ReactNode>();
  for (const node of nodes) {
    if (isValidElement<{ "data-home-part"?: string }>(node) && node.props["data-home-part"]) {
      byPart.set(node.props["data-home-part"], node);
    }
  }
  return <>{order.map(key => <Fragment key={key}>{byPart.get(key)}</Fragment>)}</>;
}

function CustomBlock({ block, locale, images }: { block: LandingLayoutBlock; locale: Locale; images: Record<string, string> }) {
  const title = localizedSetting(block.title, locale);
  const body = localizedSetting(block.body, locale);
  const image = <img src={images[`layout-${block.id}`]} alt={title} loading="lazy" />;
  const text = <>{title && <h2>{title}</h2>}{body && <p>{body}</p>}</>;
  return <div className={`mc-layout-custom mc-layout-tone-${block.tone} mc-layout-space-${block.spacing}`}
    data-layout-block={block.id} data-layout-type={block.type}
    style={{ textAlign: block.alignment }}>
    {block.type === "spacer" ? <div className={`mc-layout-spacer mc-layout-space-${block.spacing}`} aria-hidden="true" />
      : block.type === "image" ? <figure>{block.href ? <a href={block.href}>{image}</a> : image}{body && <figcaption>{body}</figcaption>}</figure>
      : block.type === "button" ? <a className="mc-button mc-button-gold" href={block.href}>{title || body || (locale === "fa" ? "مشاهده" : "View")}</a>
      : block.href ? <a className="mc-layout-content-link" href={block.href}>{text}</a> : text}
  </div>;
}

export default function LandingLayoutRenderer({ layout, language, images, children, extraSections }: {
  layout: LandingLayout;
  language: Locale;
  images: Record<string, string>;
  children: ReactNode;
  extraSections: Partial<Record<keyof LandingPageSettings["sections"], ReactNode>>;
}) {
  const sections = new Map<string, ReactNode>(Object.entries(extraSections));
  for (const node of Children.toArray(children)) {
    if (isValidElement<{ "data-home-section"?: string }>(node) && node.props["data-home-section"]) {
      sections.set(node.props["data-home-section"], node);
    }
  }
  return <>{layout.rows.map(row => {
    const blocks = row.blocks.filter(block => block.enabled).map(block => {
      const custom = ["text", "image", "button", "spacer"].includes(block.type);
      const node = custom ? <CustomBlock block={block} locale={language} images={images} /> : sections.get(block.type);
      return node ? { block, node } : null;
    }).filter((item): item is NonNullable<typeof item> => item !== null);
    if (!blocks.length) return null;
    const natural = row.columns === 1 && row.width === "full" && blocks.length === 1 && !["text", "image", "button", "spacer"].includes(blocks[0].block.type);
    return <div key={row.id} data-layout-row={row.id}
      className={natural ? "mc-layout-natural" : `mc-layout-row mc-layout-width-${row.width} mc-layout-gap-${row.gap}`}
      style={natural ? undefined : { "--layout-columns": row.columns } as CSSProperties}>
      {blocks.map(({ block, node }) => <div key={block.id} className={natural ? "mc-layout-natural" : "mc-layout-cell"} data-layout-placement={block.type} data-layout-block-id={block.id}>{node}</div>)}
    </div>;
  })}</>;
}
