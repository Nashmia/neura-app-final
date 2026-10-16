/** The glowing wave and orbit line from the design, drawn on navy. Decorative. */
export function GlowWave({ className, id = "wave-glow" }: { className?: string; id?: string }) {
  return (
    <svg viewBox="0 0 744 500" preserveAspectRatio="xMidYMid slice" className={className} fill="none">
      <defs>
        <filter id={id} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="9" /></filter>
      </defs>
      <ellipse cx="372" cy="232" rx="302" ry="118" transform="rotate(-13 372 232)" stroke="#4a55b0" strokeWidth="1.2" />
      <path d="M-10 362C120 320 200 150 300 98S470 120 560 220 700 278 760 266" stroke="#8ea0ff" strokeWidth="14" strokeOpacity="0.55" filter={`url(#${id})`} />
      <path d="M-10 362C120 320 200 150 300 98S470 120 560 220 700 278 760 266" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="83" cy="297" r="6" fill="#c9d0ff" />
      <circle cx="664" cy="150" r="6" fill="#c9d0ff" />
    </svg>
  );
}
