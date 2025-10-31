interface WatermarkOverlayProps {
  username: string;
  roleLabel: string;
  dateLabel: string;
}

const TILE_COUNT = 40;

export function WatermarkOverlay({ username, roleLabel, dateLabel }: WatermarkOverlayProps) {
  const tiles = Array.from({ length: TILE_COUNT });

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] select-none overflow-hidden" aria-hidden>
      <div className="absolute left-1/2 top-1/2 h-[200%] w-[200%] -translate-x-1/2 -translate-y-1/2 rotate-[-24deg] opacity-30">
        <div className="grid h-full w-full grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-16">
          {tiles.map((_, index) => (
            <div
              key={`watermark-${index}`}
              className="flex min-h-[120px] flex-col items-center gap-3 rounded-3xl bg-white/8 px-6 py-4 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 shadow-sm md:min-h-[130px] md:px-8"
            >
              <div className="h-10 w-32 flex-shrink-0 bg-[url('/logo-horizontal.png')] bg-contain bg-center bg-no-repeat opacity-75" />
              <div className="flex w-full flex-wrap items-center justify-center gap-2 md:justify-between">
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{username}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[9px] uppercase tracking-[0.12em] text-slate-400">{roleLabel}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[9px] tracking-[0.08em] text-slate-400">{dateLabel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
