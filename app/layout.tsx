import type { Metadata } from "next";
import { DM_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";

// Body face: DM Sans — clean and highly legible for running text and UI.
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Display face: Source Serif 4 — a calm editorial serif for headings, with an
// italic used for the accent words ("that matter", "checklist", ...).
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  style: ["normal", "italic"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Neura | Cognitive Support for Dementia Care",
  description: "Full-stack dementia care support app for caregivers and patients.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${sourceSerif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
