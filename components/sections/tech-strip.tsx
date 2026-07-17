const TECH = ['Soroban', 'Freighter', 'Stellar']

export function TechStrip() {
  return (
    <section className="w-full border-y border-[var(--border-default)] bg-[var(--bg-surface)] py-5">
      <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-xs font-mono tracking-widest text-[var(--text-muted)] uppercase">
        <p className="font-semibold text-[var(--text-secondary)]">Made with</p>
        <div className="flex items-center gap-8 sm:gap-12">
          {TECH.map((name) => (
            <span key={name} className="font-semibold text-[var(--text-secondary)]/80 tracking-widest hover:text-[var(--text-primary)] transition-colors">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
