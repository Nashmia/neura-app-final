import { Activity, Brain, CalendarCheck, HeartPulse, Home, LayoutDashboard, Pill, ShieldCheck, UserRound } from "lucide-react";

export const landingFeatures = [
  { icon: Brain, title: "Cognitive Quizzes", description: "Large, calm, one-question screens for supervised memory and recognition activities." },
  { icon: Pill, title: "Medication Tracking", description: "Caregivers can add medicines, update status, and see pending doses clearly." },
  { icon: Activity, title: "Progress Insights", description: "Weekly trends turn quiz sessions into simple, readable progress summaries." },
  { icon: ShieldCheck, title: "Caregiver First", description: "Sensitive records are managed by caregivers while patients use simplified screens." },
];

export const howItWorks = [
  { title: "Create caregiver account", description: "Sign up securely and access a private caregiver workspace." },
  { title: "Add patient details", description: "Set up patient profile, dementia stage, medical notes, and quiz preferences." },
  { title: "Support daily care", description: "Track medication, start quizzes, and review dashboard insights." },
];

export const testimonials = [
  { name: "Ayesha Khan", role: "Family caregiver", quote: "Neura makes daily care feel organized instead of overwhelming." },
  { name: "Dr. Hamza Malik", role: "Care advisor", quote: "The calm quiz interface is much easier for elderly patients to follow." },
  { name: "Sara Ahmed", role: "Care coordinator", quote: "The dashboard gives families a clear picture of daily care routines." },
];

export const faqs = [
  { question: "Is Neura a diagnosis tool?", answer: "No. Neura is a supportive care platform and does not replace professional medical advice." },
  { question: "Who manages the patient data?", answer: "The caregiver owns the account and manages patient profile, medication, and quiz activity." },
  { question: "Is it responsive?", answer: "Yes. The layouts are built for laptop, tablet, and mobile screens." },
  { question: "Is chat included?", answer: "No. The AI chat part is intentionally left out in this package as requested." },
];

export const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Brain, label: "Quiz", href: "/quiz" },
  { icon: Pill, label: "Medication", href: "/medications" },
  { icon: UserRound, label: "Onboarding", href: "/onboarding" },
  { icon: Home, label: "Landing", href: "/" },
];

export const metricIcons = [Brain, Pill, CalendarCheck, HeartPulse];
