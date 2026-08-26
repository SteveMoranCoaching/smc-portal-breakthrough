"use client"

type ExerciseLibraryTileProps = {
  exercise: {
    id: string
    exercise_name: string
    coach_notes?: string | null
    thumbnail_url?: string | null
    is_favourite?: boolean
  }
  onAdd: () => void
}

export default function ExerciseLibraryTile({
  exercise,
  onAdd,
}: ExerciseLibraryTileProps) {
  return (
    <article className="group overflow-hidden rounded-[1rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.018))] transition hover:border-smc-gold/30 hover:bg-smc-gold/[0.04]">
      {exercise.thumbnail_url ? (
        <div className="relative h-20 overflow-hidden bg-black/40">
          <img
            src={exercise.thumbnail_url}
            alt={exercise.exercise_name}
            className="h-full w-full object-cover opacity-70 transition duration-300 group-hover:scale-[1.03] group-hover:opacity-90"
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        </div>
      ) : (
        <div className="flex h-16 items-center justify-center bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.10),transparent_55%),#080808]">
          <span className="text-lg font-black text-smc-gold/45">
            +
          </span>
        </div>
      )}

      <div className="p-2.5">
        <div className="flex items-start gap-1.5">
  {exercise.is_favourite && (
    <span className="shrink-0 text-xs text-smc-gold">
      ⭐
    </span>
  )}

  <p className="line-clamp-2 text-xs font-black leading-4 text-white">
    {exercise.exercise_name}
  </p>
</div>

        {exercise.coach_notes ? (
          <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-white/35">
            {exercise.coach_notes}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onAdd}
          className="mt-2 flex min-h-[32px] w-full items-center justify-center rounded-xl border border-smc-gold/25 bg-smc-gold/[0.08] px-2 text-[9px] font-black uppercase tracking-[0.12em] text-smc-gold transition hover:bg-smc-gold hover:text-black active:scale-[0.98]"
        >
          Add to Session
        </button>
      </div>
    </article>
  )
}