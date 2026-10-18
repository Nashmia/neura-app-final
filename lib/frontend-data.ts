import { Activity, Brain, CalendarCheck, HeartPulse, Home, LayoutDashboard, MessageCircle, Pill, Settings, ShieldCheck, Sparkles, UserRound } from "lucide-react";

export const landingFeatures = [
  { icon: Brain, title: "Guided cognitive activities", description: "Offer supervised memory, recognition, and other cognitive exercises through a simple, easy-to-follow interface." },
  { icon: Pill, title: "Medication tracking", description: "Record medications, update dose status, and see what's due next in the daily routine." },
  { icon: Activity, title: "Progress at a glance", description: "Review recorded cognitive activity results and weekly trends in a clear, readable dashboard." },
  { icon: ShieldCheck, title: "Caregiver-first workspace", description: "Manage the patient's profile and care records from your caregiver account, with simplified screens for supervised activities." },
];

export const howItWorks = [
  { title: "Create your caregiver account", description: "Set up your caregiver workspace to manage your loved one's care information." },
  { title: "Add your loved one's profile", description: "Record relevant patient details and organize the information you need for everyday care." },
  { title: "Make daily care easier to follow", description: "Track medication, guide cognitive activities, record observations, and review activity history over time." },
];

export const faqs = [
  { question: "Is Neura a diagnostic tool?", answer: "No. Neura is a caregiver support and tracking platform. It does not diagnose dementia, replace a healthcare professional, or provide a substitute for medical advice." },
  { question: "Who manages the patient's information?", answer: "The caregiver creates and manages the account and the patient's care information within the application." },
  { question: "Can I use Neura on my phone?", answer: "Neura is designed to adapt to laptop, tablet, and mobile screens." },
  { question: "What are the cognitive activities for?", answer: "They provide guided, supervised activities and let caregivers record results over time. They are not diagnostic tests and should not be used to draw medical conclusions." },
  { question: "Does Neura use AI?", answer: "Neura includes AI-powered functionality for supported features. AI-generated responses can be imperfect and should not replace professional medical guidance." },
];

export const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: MessageCircle, label: "Cognitive Quiz", href: "/chat" },
  { icon: Sparkles, label: "Care Assistant", href: "/assistant" },
  { icon: Pill, label: "Medication", href: "/medications" },
  { icon: CalendarCheck, label: "Appointments", href: "/appointments" },
  { icon: HeartPulse, label: "Journal", href: "/journal" },
  { icon: UserRound, label: "Onboarding", href: "/onboarding" },
  { icon: Settings, label: "Settings", href: "/settings" },
  { icon: Home, label: "Landing", href: "/" },
];

export const metricIcons = [Brain, Pill, CalendarCheck, HeartPulse];
