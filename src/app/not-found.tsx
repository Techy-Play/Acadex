"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const jokes = [
  {
    emoji: "🗺️",
    headline: "You've wandered off the map!",
    punchline: "Even Google Maps can't find this page.",
  },
  {
    emoji: "🕳️",
    headline: "This page fell into a black hole",
    punchline: "Not even light can escape... or this URL.",
  },
  {
    emoji: "🧙‍♂️",
    headline: "A wizard removed this page",
    punchline: "\"You shall not pass!\" — This URL, probably.",
  },
  {
    emoji: "🏗️",
    headline: "Under construction... forever",
    punchline: "This page has been \"coming soon\" since 2024.",
  },
  {
    emoji: "👻",
    headline: "Boo! This page is a ghost",
    punchline: "It existed once, but now it just haunts our servers.",
  },
  {
    emoji: "🍕",
    headline: "This page went out for pizza",
    punchline: "It said it'd be right back. That was 3 hours ago.",
  },
  {
    emoji: "🐛",
    headline: "A bug ate this page",
    punchline: "We told them to eat the bugs in the code, not the pages!",
  },
  {
    emoji: "🚀",
    headline: "Houston, we have a problem",
    punchline: "This page was launched into space and never came back.",
  },
  {
    emoji: "🎭",
    headline: "Plot twist: this page doesn't exist",
    punchline: "Directed by M. Night Shyamalan.",
  },
  {
    emoji: "🧊",
    headline: "This page is frozen",
    punchline: "Let it go, let it gooo... to the homepage.",
  },
  {
    emoji: "🪦",
    headline: "R.I.P. this page",
    punchline: "It lived a good life. Well, actually it never lived at all.",
  },
  {
    emoji: "🦖",
    headline: "This page went extinct",
    punchline: "Along with the dinosaurs and your hopes of finding it.",
  },
  {
    emoji: "🎰",
    headline: "Wrong bet!",
    punchline: "You gambled on this URL and the house always wins.",
  },
  {
    emoji: "🧳",
    headline: "This page is on vacation",
    punchline: "It's sipping coconut water on a beach somewhere. Without you.",
  },
  {
    emoji: "🤖",
    headline: "Beep boop. Page not computed.",
    punchline: "I'm a server, not a magician.",
  },
  {
    emoji: "🐔",
    headline: "Why did the user visit this page?",
    punchline: "To get to the other side... which also doesn't exist.",
  },
];

export default function NotFound() {
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md w-full space-y-8">
        {/* Animated 404 */}
        <div className="relative">
          <h1
            className={`text-[10rem] font-black leading-none tracking-tighter text-primary/10 select-none transition-all duration-300 ${
              glitch ? "scale-95 opacity-40 blur-sm" : "scale-100 opacity-100 blur-0"
            }`}
          >
            404
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
            glitch ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          <h2 className="text-2xl font-bold tracking-tight">{joke.headline}</h2>
          <p className="text-muted-foreground text-lg">{joke.punchline}</p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go Home
          </Link>
          <button
            onClick={shuffle}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border bg-card font-semibold hover:bg-muted transition-all hover:-translate-y-0.5"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Another Joke
          </button>
        </div>

        {/* Subtle footer */}
        <p className="text-xs text-muted-foreground/60 pt-8">
          Acadex &bull; Wrong turn, right attitude ✌️
        </p>
      </div>
    </div>
  );
}
