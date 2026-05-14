"use client";

import { useEffect, useMemo, useState } from "react";

const playedAnimationKeys = new Set<string>();

type TypewriterTextProps = {
  animate?: boolean;
  animationKey: string;
  className?: string;
  text: string;
};

export function TypewriterText({ animate = false, animationKey, className, text }: TypewriterTextProps) {
  const characters = useMemo(() => Array.from(text), [text]);
  const shouldAnimate = animate && !playedAnimationKeys.has(animationKey);
  const [visibleCount, setVisibleCount] = useState(shouldAnimate ? 0 : characters.length);

  useEffect(() => {
    if (!shouldAnimate) {
      setVisibleCount(characters.length);
      return;
    }

    playedAnimationKeys.add(animationKey);
    setVisibleCount(0);
    if (characters.length === 0) return;

    const chunkSize = Math.max(1, Math.ceil(characters.length / 720));
    const timer = window.setInterval(() => {
      setVisibleCount((current) => {
        const next = Math.min(characters.length, current + chunkSize);
        if (next >= characters.length) {
          window.clearInterval(timer);
        }
        return next;
      });
    }, 18);

    return () => window.clearInterval(timer);
  }, [animationKey, characters, shouldAnimate]);

  return (
    <span className={className} dir="auto">
      {characters.slice(0, visibleCount).join("")}
      {visibleCount < characters.length ? <span className="mx-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-zinc-300/80" /> : null}
    </span>
  );
}
