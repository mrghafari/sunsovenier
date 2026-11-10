import type { HeroArtworkDefinition } from "./hero-artwork";

type Props = { artwork: HeroArtworkDefinition };

export default function HeroArtworkOverlay({ artwork }: Props) {
  return (
    <svg
      className="mc-hero-artwork"
      viewBox={`0 0 ${artwork.width} ${artwork.height}`}
      preserveAspectRatio="xMidYMid meet"
      direction="ltr"
      role="img"
      aria-label={[artwork.accessibleName, ...artwork.layers.map((layer) => layer.text.replace(/\n/g, " "))].join(". ")}
      focusable="false"
    >
      {artwork.layers.map((layer) => (
        <text
          key={layer.id}
          x={layer.align === "middle" ? layer.x + layer.width / 2 : layer.align === "end" ? layer.x + layer.width : layer.x}
          y={layer.y}
          textAnchor={layer.align ?? "start"}
          dominantBaseline="hanging"
          fontFamily="Manrope, 'Plus Jakarta Sans', sans-serif"
          fontSize={layer.fontSize}
          fontWeight={layer.fontWeight}
          letterSpacing="0"
          fill="#fff"
        >
          {layer.text.split("\n").map((line, index) => (
            <tspan key={`${layer.id}-${index}`} x={layer.align === "middle" ? layer.x + layer.width / 2 : layer.align === "end" ? layer.x + layer.width : layer.x} dy={index === 0 ? 0 : layer.lineHeight}>
              {line || "\u00a0"}
            </tspan>
          ))}
        </text>
      ))}
    </svg>
  );
}
