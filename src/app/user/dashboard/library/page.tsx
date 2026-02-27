"use client";

import { useEffect, useState } from "react";
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
];

export default function UserLibraryPage() {
  const [joke, setJoke] = useState(jokes[0]);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    setJoke(jokes[Math.floor(Math.random() * jokes.length)]);
  }, []);

  const shuffle = () => {
    setGlitch(true);
    setTimeout(() => {
      let next;
      do {
        next = jokes[Math.floor(Math.random() * jokes.length)];
      } while (next.headline === joke.headline);
      setJoke(next);
      setGlitch(false);
    }, 300);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="text-center max-w-md w-full space-y-8">
        {/* Animated WIP badge */}
        <div className="relative">
          <h1
            className={`text-[8rem] font-black leading-none tracking-tighter text-primary/10 select-none transition-all duration-300 ${
              glitch
                ? "scale-95 opacity-40 blur-sm"
                : "scale-100 opacity-100 blur-0"
            }`}
          >
            WIP
          </h1>
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
              glitch ? "scale-110 opacity-0" : "scale-100 opacity-100"
            }`}
          >
            <span className="text-7xl animate-bounce">{joke.emoji}</span>
          </div>
        </div>

        {/* Joke content */}
        <div
          className={`space-y-3 transition-all duration-300 ${
            glitch
              ? "translate-y-4 opacity-0"
              : "translate-y-0 opacity-100"
          }`}
        >
          <h2 className="text-2xl font-bold tracking-tight">
            {joke.headline}
          </h2>
          <p className="text-muted-foreground text-lg">{joke.punchline}</p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
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
          <button
            onClick={shuffle}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border bg-card font-semibold hover:bg-muted transition-all hover:-translate-y-0.5"
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Another Joke
          </button>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground/60 pt-8">
          Acadex &bull; Good things take time 🚧
        </p>
      </div>
    </div>
  );
}
