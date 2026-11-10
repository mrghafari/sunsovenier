export type HeroArtworkLayer = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  align?: "start" | "middle" | "end";
};

export type HeroArtworkSettings = {
  enabled?: boolean;
  layers?: HeroArtworkLayer[];
};

export type HeroArtworkDefinition = {
  sourceUrl: string;
  cleanUrl: string;
  width: number;
  height: number;
  accessibleName: string;
  layers: HeroArtworkLayer[];
};

const logistics: HeroArtworkDefinition = {
  sourceUrl: "/api/landing-media/68bb40f80d676ebc027bbffa5bcee7fda96db410f1e5e2bb5ac9eaff12ac7227.jpg",
  cleanUrl: "/landing/banner-logistics-clean.png",
  width: 1024,
  height: 572,
  accessibleName: "Secure global chemical packaging and logistics by Momtazchem",
  layers: [
    { id: "logistics-title-1", text: "SECURE GLOBAL CHEMICAL PACKAGING", x: 52, y: 294, width: 860, fontSize: 37, fontWeight: 700, lineHeight: 43 },
    { id: "logistics-title-2", text: "& LOGISTICS BY MOMTAZCHEM", x: 52, y: 338, width: 820, fontSize: 37, fontWeight: 700, lineHeight: 43 },
    { id: "logistics-caption", text: "MOMTAZCHEM SPECIALIZED CHEMICAL LOGISTICS SERVICES", x: 53, y: 386, width: 900, fontSize: 20, fontWeight: 700, lineHeight: 24 },
  ],
};

const solvent: HeroArtworkDefinition = {
  sourceUrl: "/api/landing-media/b950c9584c5be6d6d601e8c2bba28c3436fe38c8198506f785b41a711ac11c17.jpg",
  cleanUrl: "/landing/banner-solvent-clean.png",
  width: 1024,
  height: 572,
  accessibleName: "White Spirit Solvent 402 product overview, applications and hydrocarbon properties",
  layers: [
    { id: "solvent-eyebrow", text: "INDUSTRIAL EXCELLENCE:", x: 129, y: 108, width: 310, fontSize: 12, fontWeight: 400, lineHeight: 14 },
    { id: "solvent-subtitle", text: "High-Purity Versatile Industrial Solvents", x: 129, y: 126, width: 340, fontSize: 12, fontWeight: 400, lineHeight: 14 },
    { id: "solvent-title", text: "WHITE SPIRIT -\nSOLVENT 402", x: 129, y: 145, width: 330, fontSize: 30, fontWeight: 700, lineHeight: 32 },
    { id: "solvent-applications", text: "APPLICATION SOLUTIONS", x: 129, y: 208, width: 360, fontSize: 26, fontWeight: 400, lineHeight: 30 },
    { id: "solvent-paint-title", text: "PAINT & RESIN PRODUCTION", x: 158, y: 257, width: 160, fontSize: 9, fontWeight: 700, lineHeight: 11 },
    { id: "solvent-paint-description", text: "Enhanced dilution and flow control.", x: 158, y: 273, width: 160, fontSize: 8, fontWeight: 400, lineHeight: 10 },
    { id: "solvent-textile-title", text: "DRY CLEANING & TEXTILE", x: 325, y: 257, width: 160, fontSize: 9, fontWeight: 700, lineHeight: 11 },
    { id: "solvent-textile-description", text: "Solvent for grease and organic stains.", x: 325, y: 273, width: 160, fontSize: 8, fontWeight: 400, lineHeight: 10 },
    { id: "solvent-degreasing-title", text: "INDUSTRIAL DEGREASING\n& CLEANING", x: 158, y: 297, width: 160, fontSize: 9, fontWeight: 700, lineHeight: 11 },
    { id: "solvent-degreasing-description", text: "Removal of grease and oil.", x: 158, y: 325, width: 160, fontSize: 8, fontWeight: 400, lineHeight: 10 },
    { id: "solvent-maintenance-title", text: "MACHINERY\nMAINTENANCE", x: 325, y: 295, width: 160, fontSize: 9, fontWeight: 700, lineHeight: 11 },
    { id: "solvent-maintenance-description", text: "Removal of grease and oil.", x: 325, y: 323, width: 160, fontSize: 8, fontWeight: 400, lineHeight: 10 },
    { id: "solvent-body", text: "WHITE SPIRIT - SOLVENT 402 (ALSO KNOWN AS MINERAL SPIRIT OR\nSOLVENT 402) IS A CAREFULLY REFINED MIXTURE OF PARAFFINIC,\nCYCLOPARAFFINIC AND AROMATIC HYDROCARBONS. IT IS DESIGNED\nFOR SUPERIOR PERFORMANCE AS A THINNER AND CLEANER.", x: 129, y: 352, width: 320, fontSize: 9, fontWeight: 400, lineHeight: 13 },
    { id: "solvent-center-title", text: "WHITE SPIRIT\n- SOLVENT 402", x: 615, y: 258, width: 150, fontSize: 20, fontWeight: 700, lineHeight: 22, align: "middle" },
    { id: "solvent-hydrocarbon-title", text: "HYDROCARBONS", x: 501, y: 178, width: 144, fontSize: 12, fontWeight: 400, lineHeight: 14 },
    { id: "solvent-hydrocarbon-description", text: "Pure, refined, and\nconsistent.", x: 501, y: 196, width: 100, fontSize: 8, fontWeight: 400, lineHeight: 10 },
    { id: "solvent-aromatics-top-title", text: "AROMATICS", x: 806, y: 128, width: 120, fontSize: 12, fontWeight: 400, lineHeight: 14 },
    { id: "solvent-aromatics-top-description", text: "Excellent solvency and\nsolvent power.", x: 806, y: 147, width: 84, fontSize: 8, fontWeight: 400, lineHeight: 10 },
    { id: "solvent-cycloalkanes-title", text: "CYCLOALKANES", x: 862, y: 269, width: 140, fontSize: 12, fontWeight: 400, lineHeight: 14 },
    { id: "solvent-cycloalkanes-description", text: "Optimal physical and\ntechnical properties.", x: 873, y: 287, width: 95, fontSize: 8, fontWeight: 400, lineHeight: 10, align: "middle" },
    { id: "solvent-aromatics-bottom-title", text: "AROMATICS", x: 501, y: 371, width: 120, fontSize: 12, fontWeight: 400, lineHeight: 14 },
    { id: "solvent-aromatics-bottom-description", text: "Excellent solvency and\nsolvent power.", x: 501, y: 390, width: 105, fontSize: 8, fontWeight: 400, lineHeight: 10 },
    { id: "solvent-linear-alkanes-title", text: "LINEAR ALKANES", x: 826, y: 403, width: 150, fontSize: 12, fontWeight: 400, lineHeight: 14 },
    { id: "solvent-linear-alkanes-description", text: "Moderate volatility and\ncontrolled evaporation.", x: 841, y: 422, width: 95, fontSize: 8, fontWeight: 400, lineHeight: 10, align: "middle" },
  ],
};

export const heroArtworkDefinitions = [logistics, solvent] as const;

export function defaultHeroArtworkFor(sourceUrl: string): HeroArtworkDefinition | undefined {
  return heroArtworkDefinitions.find((artwork) => artwork.sourceUrl === sourceUrl);
}

export function resolveHeroArtwork(sourceUrl: string, settings?: HeroArtworkSettings): HeroArtworkDefinition | null {
  const defaults = defaultHeroArtworkFor(sourceUrl);
  if (settings?.enabled === false || (settings?.enabled !== true && !defaults)) return null;
  return {
    sourceUrl,
    cleanUrl: defaults?.cleanUrl ?? sourceUrl,
    width: defaults?.width ?? 1024,
    height: defaults?.height ?? 572,
    accessibleName: defaults?.accessibleName ?? "Banner text",
    layers: settings?.layers ?? defaults?.layers ?? [],
  };
}

export function effectiveHeroImageUrl(sourceUrl: string, settings?: HeroArtworkSettings): string {
  return resolveHeroArtwork(sourceUrl, settings)?.cleanUrl ?? sourceUrl;
}
