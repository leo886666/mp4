"use client";

import { useEffect, useState } from "react";
import { HeroCard, type CardLink } from "@/components/cards";
import { cn } from "@/lib/utils";
import type { Drama } from "@/lib/types";

export interface HeroSlide {
  id: string;
  title: string;
  subtitle?: string | null;
  image: string;
  link: string;
  series: Drama | null;
}

export function HeroCarousel({ slides, linkTo = "title" }: { slides: HeroSlide[]; linkTo?: CardLink }) {
  const [idx, setIdx] = useState(0);
  const usable = slides.filter((s) => s.series);

  useEffect(() => {
    if (usable.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % usable.length), 6000);
    return () => clearInterval(t);
  }, [usable.length]);

  if (!usable.length) return null;

  return (
    <div>
      <div className="relative">
        {usable.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              "transition-opacity duration-700",
              i === idx ? "opacity-100 relative" : "opacity-0 absolute inset-0 pointer-events-none"
            )}
            aria-hidden={i !== idx}
          >
            <HeroCard drama={{ ...s.series!, hero: s.image || s.series!.hero }} linkTo={linkTo} />
          </div>
        ))}
      </div>
      {usable.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {usable.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIdx(i)}
              aria-label={`Slide ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === idx ? "w-6 bg-inv" : "w-1.5 bg-inv/15 hover:bg-inv/30"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
