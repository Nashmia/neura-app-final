import { cn } from "@/lib/utils";

/*
  Landing hero artwork.

  The source render is only 822×454, so text baked into it (card labels,
  icons, the caption) turned to mush on any screen above 1× density. The
  raster now carries only the soft, low-frequency parts — the glass
  sculpture, card bodies, orbit and shadows — and every high-frequency detail
  is drawn here as vector SVG in the image's own coordinate space
  (viewBox 0 0 822 454), so it stays crisp at any size or pixel density.

  Each card group is rotated about its centre to match the card's tilt in the
  render. Replace the raster with a 2× export of the same scene
  (1644×908, no text) for a fully sharp sculpture on high-density screens.
*/

const W = 822;
const H = 454;

const titleProps = { className: "font-sans", fontWeight: 500, fill: "#262a3f" } as const;
const subtitleProps = { className: "font-sans", fontWeight: 400, fontSize: 9, fill: "#5d6075" } as const;

function Arrow({ x, y, color = "#262a3f" }: { x: number; y: number; color?: string }) {
  return (
    <path
      d={`M${x - 4} ${y}h8m-3-3 3 3-3 3`}
      fill="none"
      stroke={color}
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export function HeroArt({ className }: { className?: string }) {
  return (
    <div className={cn("hero-art-mask relative aspect-[822/454]", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero-art-base.webp"
        alt="A glass sculpture orbited by Medication, Memory Exercise and Mood Notes cards"
        width={W}
        height={H}
        fetchPriority="high"
        className="absolute inset-0 size-full"
      />
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden>
        {/* Medication */}
        <g transform="translate(181 104.5) rotate(7.3)">
          <g transform="translate(-17 -29) rotate(-45)">
            <rect x={-16} y={-6} width={32} height={12} rx={6} fill="#e0794a" stroke="#2b2b33" strokeWidth={1.4} />
            <path d="M0 -6v12" stroke="#2b2b33" strokeWidth={1.4} />
            <rect x={-14.6} y={-4.6} width={14.6} height={9.2} rx={4.6} fill="#c9603a" />
          </g>
          <text x={-38.5} y={15.4} fontSize={12} {...titleProps}>Medication</text>
          <text x={-39.8} y={35} {...subtitleProps}>Stay on track</text>
          <Arrow x={36.5} y={32.5} />
        </g>

        {/* Memory Exercise */}
        <g transform="translate(160.5 321) rotate(-7.8)">
          <svg x={-39.5} y={-39} width={29} height={29} viewBox="0 0 24 24" fill="none" stroke="#1f255c" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
            <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
            <path d="M12 5v13M9 9.5h.01M15 9.5h.01M8 14h.01M16 14h.01" />
          </svg>
          <text x={-42} y={15.9} fontSize={10.5} {...titleProps} fill="#1f255c">Memory Exercise</text>
          <text x={-42.5} y={34.3} {...subtitleProps} fill="#4a5080">Build &amp; maintain</text>
          <Arrow x={39.5} y={31.5} color="#1f255c" />
        </g>

        {/* Mood Notes */}
        <g transform="translate(605 224.5) rotate(-10.5)">
          <g transform="translate(-19.7 -25.5)" fill="none" stroke="#262a3f" strokeWidth={1.5} strokeLinecap="round">
            <circle r={13} />
            <path d="M-6 3.5a7.5 7.5 0 0 0 12 0" />
            <circle cx={-4.6} cy={-3.4} r={0.6} fill="#262a3f" strokeWidth={1.8} />
            <circle cx={4.6} cy={-3.4} r={0.6} fill="#262a3f" strokeWidth={1.8} />
          </g>
          <text x={-39.9} y={13.3} fontSize={11.6} {...titleProps}>Mood Notes</text>
          <text x={-40.8} y={31.4} {...subtitleProps}>See changes</text>
          <Arrow x={36.7} y={29.5} />
        </g>

        {/* Caption and its leader line */}
        <path d="M531 100 588 61h6" fill="none" stroke="#c9d0ff" strokeOpacity={0.7} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" />
        <text className="font-display" fontStyle="italic" fontSize={17} fill="#e3e7ff">
          <tspan x={605} y={65}>A clearer picture</tspan>
          <tspan x={605} y={87}>of care, day by day.</tspan>
        </text>
      </svg>
    </div>
  );
}
