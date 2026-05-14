import {
  BarChart3,
  Box,
  Film,
  ImageIcon,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Wand2,
  type LucideIcon
} from "lucide-react";

export type CapabilityStatus = "Available" | "Phase 1" | "Preview" | "Planned";

export type Capability = {
  description: string;
  icon: LucideIcon;
  status: CapabilityStatus;
  title: string;
};

export const featuredCapabilities: Capability[] = [
  {
    description: "Turn visual ideas into production-ready image prompts.",
    icon: ImageIcon,
    status: "Available",
    title: "Image Direction"
  },
  {
    description: "Shape product visuals for ads, launches, and campaign assets.",
    icon: Megaphone,
    status: "Phase 1",
    title: "Product Advertising"
  },
  {
    description: "Understand what to take from a reference image before prompting.",
    icon: BarChart3,
    status: "Preview",
    title: "Reference Reading"
  },
  {
    description: "Turn campaign thinking into prompt-ready visual systems.",
    icon: Sparkles,
    status: "Preview",
    title: "Campaign Direction"
  },
  {
    description: "Translate edit notes into precise finishing instructions.",
    icon: Wand2,
    status: "Phase 1",
    title: "Retouching Direction"
  },
  {
    description: "Prepare motion, rhythm, and frame-by-frame visual direction.",
    icon: Film,
    status: "Planned",
    title: "Video Direction"
  },
  {
    description: "Keep product identity consistent across outputs.",
    icon: Box,
    status: "Planned",
    title: "Product Locking"
  },
  {
    description: "Review clarity before execution.",
    icon: ShieldCheck,
    status: "Preview",
    title: "Prompt Check"
  }
];

export const showcaseStats = [
  {
    label: "Brief",
    value: "Structured"
  },
  {
    label: "Prompt",
    value: "Executable"
  },
  {
    label: "Output",
    value: "Ready"
  }
] as const;
