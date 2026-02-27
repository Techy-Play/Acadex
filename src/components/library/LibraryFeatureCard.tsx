interface LibraryFeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export function LibraryFeatureCard({ icon, title, description }: LibraryFeatureCardProps) {
  return (
    <div className="group relative rounded-2xl border bg-card/50 backdrop-blur-sm p-6 text-left space-y-3 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      {/* Animated border glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10" />

      <div className="relative z-10">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
          {icon}
        </div>
        <h3 className="font-semibold text-base mt-3">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
