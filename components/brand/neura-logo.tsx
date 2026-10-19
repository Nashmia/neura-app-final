import { cn } from "@/lib/utils";

/*
  Neura brand mark: the glowing wave.

  The same curve, colours and highlight as the wave in the landing page's
  closing section (components/layout/glow-wave.tsx): a bright line with a
  soft periwinkle glow. For logo sizes the line is thicker in proportion and
  has round ends. The glow is a soft periwinkle under-stroke plus a CSS
  drop-shadow sized relative to the logo, not an SVG blur filter, so it
  needs no ids (several logos can share a page) and scales smoothly.

  The wordmark is lowercase "neura" outlined from Source Sans 3 (SIL Open
  Font License) at weight 560, with +0.018em tracking and optical pair
  spacing ("ra" tightened). Outlining it means no extra font download and
  identical rendering everywhere.
*/

/** The wave from GlowWave, in its own coordinates. */
export const WAVE_PATH = "M-10 362C120 320 200 150 300 98S470 120 560 220 700 278 760 266";
/** Box around the wave and its glow; width / height = MARK_RATIO. */
export const MARK_VIEWBOX = "-50 58 860 344";
const MARK_RATIO = 860 / 344;
const GLOW_WIDTH = 44;
const CORE_WIDTH = 26;

const WORDMARK_VIEWBOX = "72.9 -504.2 2400.5 518.2";
const WORDMARK_PATH = "M74.9 0V-490.2H164.1L172.6 -423.1H175.7Q209.2 -456.1 248.2 -479.1Q287.1 -502.2 337.2 -502.2Q416.2 -502.2 452.1 -451.6Q487.9 -401 487.9 -308V0H379.2V-294Q379.2 -356.3 360.5 -382.5Q341.8 -408.8 299.8 -408.8Q266.4 -408.8 241 -392.5Q215.7 -376.3 183.7 -344.9V0ZM858.1 12Q789.8 12 734.7 -18.5Q679.7 -48.9 647.9 -106.3Q616.1 -163.7 616.1 -245.4Q616.1 -325.2 648.8 -382.7Q681.5 -440.1 733.2 -471.1Q784.8 -502 842.4 -502Q908.5 -502 953.1 -472.4Q997.8 -442.7 1020.3 -390.5Q1042.7 -338.2 1042.7 -270Q1042.7 -254.7 1041.3 -240.2Q1039.9 -225.7 1037 -212.1H696.7V-295.6H946.2Q946.2 -352.1 920.9 -383.9Q895.6 -415.8 844.2 -415.8Q815.2 -415.8 787.7 -400.1Q760.1 -384.4 742 -347.3Q723.8 -310.3 723.8 -245.5Q723.8 -186.8 744.2 -149.2Q764.5 -111.7 798.3 -93.4Q832 -75.1 871.2 -75.1Q903.9 -75.1 932.7 -84.3Q961.5 -93.4 986.5 -109.6L1024.6 -39.5Q991.1 -16 948.4 -2Q905.6 12 858.1 12ZM1322 12Q1243.4 12 1207.5 -38.5Q1171.5 -89 1171.5 -182V-490H1280.1V-196.2Q1280.1 -133.8 1298.8 -107.7Q1317.5 -81.6 1359.1 -81.6Q1392.1 -81.6 1417.5 -98.3Q1443 -115 1472.3 -152.3V-490H1580.8V0H1492L1483.4 -72.8H1480.4Q1448.1 -34.5 1410.1 -11.2Q1372 12 1322 12ZM1742.9 0V-490.2H1832.1L1840.6 -402.4H1843.7Q1869.4 -450.3 1905.9 -476.2Q1942.4 -502.2 1983 -502.2Q2001.1 -502.2 2014 -499.9Q2027 -497.6 2037.9 -492.2L2015.7 -399.7Q2004.5 -402.7 1994.6 -404.2Q1984.7 -405.7 1969 -405.7Q1939.4 -405.7 1907 -382.7Q1874.6 -359.8 1851.7 -302.1V0ZM2216.5 12Q2173.9 12 2141 -5.7Q2108.1 -23.3 2089.6 -55.5Q2071.1 -87.7 2071.1 -130.9Q2071.1 -213.6 2141.1 -256.1Q2211.1 -298.5 2362.9 -314.6Q2362 -340.7 2353.5 -363Q2345 -385.3 2325 -398.7Q2305.1 -412.1 2270.8 -412.1Q2233.6 -412.1 2198.6 -398.6Q2163.6 -385.1 2131.4 -365.3L2091.4 -439.1Q2117.5 -455.7 2149 -470.2Q2180.5 -484.7 2216.4 -493.4Q2252.2 -502 2291.2 -502Q2351.9 -502 2391.7 -477.5Q2431.6 -452.9 2451.5 -405.9Q2471.4 -358.9 2471.4 -291.5V0H2381.7L2374 -54.8H2370.1Q2335.9 -26.6 2298.3 -7.3Q2260.8 12 2216.5 12ZM2249.9 -77Q2280.9 -77 2307.6 -90.1Q2334.3 -103.3 2362.9 -129.4V-238.7Q2293 -230.4 2252.3 -216.9Q2211.6 -203.3 2194.3 -183.9Q2177 -164.5 2177 -138.3Q2177 -105.5 2197.9 -91.2Q2218.9 -77 2249.9 -77Z";
/** Wordmark width / height, so its box can be sized before it renders (no layout shift). */
const WORDMARK_RATIO = 4.6324;

const tones = {
  /** For light surfaces: a navy line (white would vanish) with the same periwinkle glow. */
  dark: { glow: "#8ea0ff", glowOpacity: 0.45, shadow: "rgba(142,160,255,0.55)", line: "#1f255c", word: "#1a1f4e" },
  /** For navy surfaces: the white line and periwinkle glow of the original wave. */
  light: { glow: "#8ea0ff", glowOpacity: 0.6, shadow: "rgba(142,160,255,0.95)", line: "#ffffff", word: "#ffffff" },
} as const;

export type NeuraLogoProps = {
  /** "full" = symbol + wordmark; "mark" = symbol only. */
  variant?: "full" | "mark";
  tone?: keyof typeof tones;
  /**
   * Symbol width in px. Leave unset to size from the current font size
   * (1.75em wide), so existing text-size classes keep working.
   */
  size?: number;
  /** One-time entrance: the wave draws in, then the wordmark fades up (about 1.2s). */
  animate?: boolean;
  /** Accessible name when the logo stands alone; omit when a parent (e.g. a link) already names it. */
  title?: string;
  className?: string;
};

export function NeuraLogo({ variant = "full", tone = "dark", size, animate = false, title, className }: NeuraLogoProps) {
  const colors = tones[tone];
  const markW = size ? `${size}px` : "1.75em";
  const markH = size ? `${size / MARK_RATIO}px` : `${1.75 / MARK_RATIO}em`;
  // Blur radius scales with the logo: 5.5% of the symbol's width.
  const blur = size ? `${size * 0.055}px` : "0.096em";
  // The wordmark's lowercase letters are about 28% of the symbol's width tall.
  const wordHeight = size ? `${size * 0.276}px` : "0.483em";
  return (
    <span
      className={cn("neura-logo inline-flex shrink-0 items-center", className)}
      data-animate={animate ? "" : undefined}
      style={{ gap: size ? `${size * 0.2}px` : "0.35em" }}
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}
    >
      <svg
        viewBox={MARK_VIEWBOX}
        width={markW}
        height={markH}
        fill="none"
        className="nl-mark shrink-0 overflow-visible"
        style={{ filter: `drop-shadow(0 0 ${blur} ${colors.shadow})` }}
        aria-hidden
      >
        <path d={WAVE_PATH} className="nl-stroke nl-stroke-1" pathLength={1} stroke={colors.glow} strokeOpacity={colors.glowOpacity} strokeWidth={GLOW_WIDTH} strokeLinecap="round" />
        <path d={WAVE_PATH} className="nl-stroke nl-stroke-1" pathLength={1} stroke={colors.line} strokeWidth={CORE_WIDTH} strokeLinecap="round" />
      </svg>
      {variant === "full" && (
        <svg
          viewBox={WORDMARK_VIEWBOX}
          height={wordHeight}
          width={size ? `${size * 0.276 * WORDMARK_RATIO}px` : `${0.483 * WORDMARK_RATIO}em`}
          className="nl-word shrink-0"
          aria-hidden
        >
          <path d={WORDMARK_PATH} fill={colors.word} />
        </svg>
      )}
    </span>
  );
}
