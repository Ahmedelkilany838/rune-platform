import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: "Rune | Build here. Execute anywhere.",
  description:
    "Rune is a creative prompt direction system that turns ideas, briefs, and creative direction into AI-executable prompts.",
  openGraph: {
    title: "Rune | Build here. Execute anywhere.",
    description: "From ideas to AI-executable prompts."
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jakarta.variable} font-sans antialiased bg-black text-zinc-100 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
