import { LibraryComingSoonBadge } from "./LibraryComingSoonBadge";

export function LibraryHero() {
  return (
    <div className="text-center space-y-6 animate-slide-up opacity-0 [animation-delay:0.1s]">
      <LibraryComingSoonBadge />

      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tighter leading-[0.9]">
        Library{" "}
        <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
          Coming Soon
        </span>
      </h1>

      <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
        A centralized academic resource index with advanced search and filtering
        — across semesters, branches, and academic years.
      </p>
    </div>
  );
}
