import { Brain, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeroCard, PillIcon, type HeroCardProps } from "@/components/landing/hero-card";

/*
  Landing hero artwork.

  The raster (public/hero-sculpture-*.webp, encoded from hero-sculpture.png)
  carries only the glass sculpture, orbit ring, backdrop and floor light. The
  three feature cards are real HTML (HeroCard) and the caption is vector SVG,
  so all text stays crisp at any size or pixel density.

  Everything is positioned in the artwork's own frame (1684×934), so cards and
  caption stay locked to the sculpture as the artwork scales.
*/

const SRC_W = 1684;
const SRC_H = 934;
// Caption coordinates are authored on an 822px-wide frame.
const VIEW_W = 822;
const VIEW_H = (VIEW_W * SRC_H) / SRC_W;

const cards: (HeroCardProps & { key: string })[] = [
  {
    key: "medication",
    icon: <PillIcon className="size-[2.4em]" />,
    title: "Medication",
    subtitle: "Stay on track",
    x: 26, y: 25, mobileX: 18, rotate: 7,
    float: { duration: 6.5, delay: -1.2, distance: 5 },
  },
  {
    key: "memory",
    icon: <Brain className="size-[2.05em]" strokeWidth={1.7} />,
    title: "Memory Exercise",
    subtitle: "Build & maintain",
    tone: "lavender",
    x: 25, y: 70, mobileX: 19, rotate: -8,
    float: { duration: 8, delay: -3.4, distance: 4 },
  },
  {
    key: "mood",
    icon: <Smile className="size-[2.05em]" strokeWidth={1.7} />,
    title: "Mood Notes",
    subtitle: "See changes",
    x: 86.5, y: 44, mobileX: 80, mobileY: 56, rotate: -10,
    float: { duration: 7.2, delay: -5.1, distance: 6 },
  },
];

export function HeroArt({ className }: { className?: string }) {
  return (
    <div className={cn("hero-art relative aspect-[1684/934]", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero-sculpture-842.webp"
        srcSet="/hero-sculpture-842.webp 842w, /hero-sculpture-1684.webp 1684w"
        sizes="(min-width: 1024px) min(822px, 57vw), min(100vw, 640px)"
        alt="A glass sculpture orbited by Medication, Memory Exercise and Mood Notes cards"
        width={SRC_W}
        height={SRC_H}
        fetchPriority="high"
        className="hero-art-mask absolute inset-0 size-full"
      />

      {/* Caption and its leader line */}
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="pointer-events-none absolute inset-0 size-full" aria-hidden>
        <path d="M531 100 588 61h6" fill="none" stroke="#c9d0ff" strokeOpacity={0.7} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" />
        <text className="font-display" fontStyle="italic" fontSize={17} fill="#e3e7ff">
          <tspan x={605} y={65}>A clearer picture</tspan>
          <tspan x={605} y={87}>of care, day by day.</tspan>
        </text>
      </svg>

      {/* Decorative: the image alt text already names the three cards. */}
      <div aria-hidden className="absolute inset-0">
        {cards.map(({ key, ...card }) => <HeroCard key={key} {...card} />)}
      </div>
    </div>
  );
}
