const TECH = ['Soroban', 'Freighter', 'Stellar']

export function TechStrip() {
  return (
    <section className="px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <p className="mb-6 text-center label-caps">Built with</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {TECH.map((name) => (
            <span
              key={name}
              className="glass rounded-full px-5 py-2 text-sm font-medium tracking-tight text-muted-foreground"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
