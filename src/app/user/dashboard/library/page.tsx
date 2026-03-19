/**
 * @page UserLibrary (/user/dashboard/library)
 * @description Library page for students (coming soon — shows rotating jokes).
 */
"use client";

import { useState } from "react";
import Link from "next/link";

const jokes = [
  {
    emoji: "🏗️",
    headline: "Hard hats required beyond this point",
    punchline: "Our devs are hammering away at this page. Literally.",
  },
  {
    emoji: "🧱",
    headline: "Still laying the bricks!",
    punchline: "Rome wasn't built in a day, and neither is this library.",
  },
  {
    emoji: "🔧",
    headline: "Wrench in the works",
    punchline: "Our engineers are tightening bolts. Please don't touch anything.",
  },
  {
    emoji: "🦺",
    headline: "Safety first. Features second.",
    punchline: "We're building something amazing — but OSHA said to slow down.",
  },
  {
    emoji: "📐",
    headline: "Still reading the blueprints",
    punchline: "Turns out \"just make a library\" requires more than a sticky note.",
  },
  {
    emoji: "🪜",
    headline: "Climbing the ladder of development",
    punchline: "We're at step 3 of 47. Almost halfway there! (Not really.)",
  },
  {
    emoji: "🚧",
    headline: "Caution: Code crossing ahead",
    punchline: "Detour through the dashboard while we pave this road.",
  },
  {
    emoji: "🪣",
    headline: "Pouring the digital concrete",
    punchline: "It needs 24 hours to set. Please come back in 24 business days.",
  },
  {
    emoji: "🔨",
    headline: "Nailed it! (The scaffolding, not the feature)",
    punchline: "The library is being built one commit at a time.",
  },
  {
    emoji: "🏗️",
    headline: "Your library is under construction",
    punchline: "Consider this the 'coming soon' trailer for a blockbuster page.",
  },
  {
    emoji: "🛠️",
    headline: "Tool time!",
    punchline: "More power! *grunting noises* — Tim \"The Toolman\" Developer",
  },
  {
    emoji: "🎨",
    headline: "Painting the walls",
    punchline: "We picked the color 'code blue'. Get it? ...We'll show ourselves out.",
  },
  {
    emoji: "🧰",
    headline: "Toolbox: open. Feature: pending.",
    punchline: "We have all the tools. Now we just need a miracle.",
  },
  {
    emoji: "🪵",
    headline: "Logging some progress",
    punchline: "console.log('library: almost done™'); // Famous last words.",
  },
  {
    emoji: "🏠",
    headline: "This page is still in the foundation stage",
    punchline: "But hey, every mansion starts with a hole in the ground!",
  },
  {
    emoji: "⚙️",
    headline: "Gears are turning (slowly)",
    punchline: "If you listen closely you can hear the server room crying.",
  },
  {
    emoji: "🧲",
    headline: "Attracting features, one magnet at a time",
    punchline: "The library is pulling in resources. Slowly. Very slowly.",
  },
  {
    emoji: "🏋️",
    headline: "Heavy lifting in progress",
    punchline: "Our devs are bench-pressing 200 lines of code right now.",
  },
  {
    emoji: "🧬",
    headline: "Still in the DNA stage",
    punchline: "This feature is evolving. Give it a few million... milliseconds.",
  },
  {
    emoji: "🎪",
    headline: "The big reveal is coming!",
    punchline: "Step right up! The library will appear... eventually.",
  },
  {
    emoji: "🗿",
    headline: "As patient as a statue",
    punchline: "This page has been waiting so long it turned to stone.",
  },
  {
    emoji: "🧑‍🍳",
    headline: "Still cooking!",
    punchline: "The library is in the oven. Don't open it or the soufflé will collapse.",
  },
  {
    emoji: "🪄",
    headline: "Abracadabra... nope, not yet",
    punchline: "Our wizards are still learning the spell to summon this page.",
  },
  {
    emoji: "🧊",
    headline: "Feature frozen... on purpose",
    punchline: "It's in the deep freeze of our backlog. Thawing soon™.",
  },
  {
    emoji: "🐌",
    headline: "Slow and steady builds the library",
    punchline: "We're on snail-powered servers. Please understand.",
  },
  {
    emoji: "🎬",
    headline: "Take 47... and ACTION!",
    punchline: "The library scene keeps getting rewritten. The director is very picky.",
  },
  {
    emoji: "🗂️",
    headline: "Filing the paperwork",
    punchline: "Turns out building a library requires an actual library of paperwork.",
  },
  {
    emoji: "🔬",
    headline: "Under the microscope",
    punchline: "We're examining every pixel. This page must be *perfect*.",
  },
  {
    emoji: "🪴",
    headline: "Growing organically",
    punchline: "We planted the seed. Now we water it with coffee and prayers.",
  },
  {
    emoji: "🛸",
    headline: "Beam me up, library!",
    punchline: "This feature is coming from another galaxy. ETA: unknown.",
  },
];

export default function UserLibraryPage() {
  const [joke] = useState(() => jokes[Math.floor(Math.random() * jokes.length)]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="text-center max-w-md w-full space-y-8">
        {/* Animated WIP badge */}
        <div className="relative">
          <h1 className="text-[8rem] font-black leading-none tracking-tighter text-primary/10 select-none">
            WIP
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-7xl animate-bounce">{joke.emoji}</span>
          </div>
        </div>

        {/* Joke content */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold tracking-tight">
            {joke.headline}
          </h2>
          <p className="text-muted-foreground text-lg">{joke.punchline}</p>
        </div>

        {/* Button */}
        <div className="flex items-center justify-center pt-4">
          <Link
            href="/user/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground/60 pt-8">
          Acadex &bull; Good things take time 🚧
        </p>
      </div>
    </div>
  );
}
