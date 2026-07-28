"use client"

type WorkoutNotesProps = {
  value: string
  disabled?: boolean
  onChange: (value: string) => void
  onFocus: () => void
  onBlur: () => void
}

export default function WorkoutNotes({
  value,
  disabled = false,
  onChange,
  onFocus,
  onBlur,
}: WorkoutNotesProps) {
  return (
    <details className="mt-2 rounded-xl border border-white/[0.055] bg-black/20">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
            Exercise Notes
          </p>

          {value.trim() && (
            <p className="mt-0.5 truncate text-[10px] text-smc-gold/65">
              Note added
            </p>
          )}
        </div>

        <span className="text-sm font-black text-white/30">＋</span>
      </summary>

      <div className="border-t border-white/[0.05] p-2">
        <textarea
          placeholder="Add notes for Steve..."
          value={value}
          disabled={disabled}
          onFocus={onFocus}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-[72px] w-full resize-none rounded-xl border border-white/[0.055] bg-black/30 p-2.5 text-sm leading-5 text-white outline-none placeholder:text-white/25 transition focus:border-smc-gold/60 disabled:opacity-50"
          rows={2}
        />
      </div>
    </details>
  )
}