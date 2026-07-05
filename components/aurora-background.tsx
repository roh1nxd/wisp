export function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* base vignette: navy fading to near-black at edges */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 120% at 50% 0%, rgba(11,19,32,0.6) 0%, rgba(6,7,16,1) 70%)',
        }}
      />

      {/* large aurora anchored bottom-left, bleeding up and to the right */}
      <div
        data-aurora
        className="absolute -bottom-[30%] -left-[20%] h-[85vh] w-[85vw] rounded-full opacity-70 blur-[160px]"
        style={{
          background:
            'radial-gradient(circle at 30% 70%, rgba(var(--aurora-indigo),0.55) 0%, rgba(var(--aurora-blue),0.35) 35%, rgba(var(--aurora-violet),0.18) 60%, rgba(0,0,0,0) 78%)',
          animation: 'aurora-drift 16s ease-in-out infinite',
        }}
      />

      {/* smaller secondary glow top-right for depth */}
      <div
        data-aurora
        className="absolute -top-[15%] right-[-10%] h-[50vh] w-[45vw] rounded-full opacity-45 blur-[140px]"
        style={{
          background:
            'radial-gradient(circle at 60% 40%, rgba(var(--aurora-violet),0.4) 0%, rgba(var(--aurora-blue),0.22) 45%, rgba(0,0,0,0) 72%)',
          animation: 'aurora-drift-alt 20s ease-in-out infinite',
        }}
      />

      {/* subtle center-bottom lift */}
      <div
        data-aurora
        className="absolute bottom-[5%] left-1/2 h-[40vh] w-[60vw] -translate-x-1/2 rounded-full opacity-30 blur-[150px]"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(var(--aurora-blue),0.3) 0%, rgba(0,0,0,0) 70%)',
          animation: 'aurora-drift 22s ease-in-out infinite',
        }}
      />
    </div>
  )
}
