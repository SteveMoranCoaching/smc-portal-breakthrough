import {
  getCircuitExerciseKey,
  getCircuitKey,
} from "@/lib/workoutKeys"

const card =
  "relative scroll-mt-24 overflow-hidden rounded-[1.35rem] border border-white/[0.055] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.014))] shadow-[0_12px_30px_rgba(0,0,0,0.55)]"

type WorkoutCircuitSectionProps = {
  exercises: any[]
  completedItems: Record<string, boolean>
  completedExerciseItems: Record<string, boolean>
  onToggleItem: (
    exerciseIndex: number,
    circuitName: string
  ) => void
  onToggleExerciseItem: (
    exerciseIndex: number,
    circuitName: string,
    circuitExerciseIndex: number,
    circuitExerciseName: string
  ) => void
}

export default function WorkoutCircuitSection({
  exercises,
  completedItems,
  completedExerciseItems,
  onToggleItem,
  onToggleExerciseItem,
}: WorkoutCircuitSectionProps) {
  if (exercises.length === 0) return null

  return (
    <section className={`${card} p-3`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smc-gold/35 to-transparent" />

      <div className="relative z-10">
        <p className="text-[9px] font-black uppercase tracking-[0.28em] text-smc-gold/70">
          Circuit Block
        </p>

        <h3 className="mt-1 text-lg font-black text-white">
          Conditioning Work
        </h3>

        <p className="mt-1 text-xs text-white/45">
          Complete each circuit as prescribed.
        </p>

        <div className="mt-3 space-y-2">
          {exercises.map((item: any) => {
            const circuit = item.exercise
            const exerciseIndex = item.originalIndex
            const circuitName =
              circuit?.name || `Circuit ${exerciseIndex + 1}`

            const circuitKey = getCircuitKey(
              exerciseIndex,
              circuitName
            )

            const nestedExercises = Array.isArray(
              circuit?.circuit?.exercises
            )
              ? circuit.circuit.exercises
              : []

            const nestedAllComplete =
              nestedExercises.length > 0 &&
              nestedExercises.every(
                (
                  circuitExercise: any,
                  circuitExerciseIndex: number
                ) => {
                  const circuitExerciseName =
                    circuitExercise.name ||
                    `Exercise ${circuitExerciseIndex + 1}`

                  const circuitExerciseKey =
                    getCircuitExerciseKey(
                      exerciseIndex,
                      circuitName,
                      circuitExerciseIndex,
                      circuitExerciseName
                    )

                  return Boolean(
                    completedExerciseItems[
                      circuitExerciseKey
                    ]
                  )
                }
              )

            const itemComplete =
              Boolean(completedItems[circuitKey]) ||
              nestedAllComplete

            return (
              <div
                key={`${circuitName}-${exerciseIndex}`}
                className={`rounded-2xl border p-3 transition ${
                  itemComplete
                    ? "border-smc-gold/35 bg-smc-gold/[0.07]"
                    : "border-white/[0.06] bg-black/25"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-black text-white">
                      {circuitName}
                    </p>

                    <p className="mt-1 break-words text-xs leading-5 text-white/45">
                      {circuit?.prescription ||
                        "Complete as prescribed."}
                    </p>

                    {circuit?.circuit && (
                      <div className="mt-3 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-smc-gold/20 bg-smc-gold/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-smc-gold">
                            {circuit.circuit.rounds || 1} rounds
                          </span>

                          {circuit.circuit.workSeconds > 0 && (
                            <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/50">
                              {circuit.circuit.workSeconds}s work
                            </span>
                          )}

                          {circuit.circuit.restSeconds > 0 && (
                            <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/50">
                              {circuit.circuit.restSeconds}s rest
                            </span>
                          )}
                        </div>

                        {nestedExercises.length > 0 && (
                          <div className="space-y-2">
                            {nestedExercises.map(
                              (
                                circuitExercise: any,
                                circuitExerciseIndex: number
                              ) => {
                                const circuitExerciseName =
                                  circuitExercise.name ||
                                  `Exercise ${
                                    circuitExerciseIndex + 1
                                  }`

                                const circuitExerciseKey =
                                  getCircuitExerciseKey(
                                    exerciseIndex,
                                    circuitName,
                                    circuitExerciseIndex,
                                    circuitExerciseName
                                  )

                                const circuitExerciseDone =
                                  Boolean(
                                    completedExerciseItems[
                                      circuitExerciseKey
                                    ]
                                  )

                                return (
                                  <div
                                    key={circuitExerciseKey}
                                    className={`rounded-xl border px-3 py-2 transition ${
                                      circuitExerciseDone
                                        ? "border-smc-gold/35 bg-smc-gold/[0.08]"
                                        : "border-white/[0.055] bg-black/30"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="text-sm font-black text-white">
                                          {circuitExerciseName}
                                        </p>

                                        {circuitExercise.prescription && (
                                          <p className="mt-0.5 text-xs leading-5 text-white/45">
                                            {
                                              circuitExercise.prescription
                                            }
                                          </p>
                                        )}
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          onToggleExerciseItem(
                                            exerciseIndex,
                                            circuitName,
                                            circuitExerciseIndex,
                                            circuitExerciseName
                                          )
                                        }
                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-black transition active:scale-95 ${
                                          circuitExerciseDone
                                            ? "border-smc-gold/60 bg-smc-gold/25 text-smc-gold"
                                            : "border-white/10 bg-white/[0.035] text-white/35"
                                        }`}
                                        aria-label={`Mark ${circuitExerciseName} complete`}
                                      >
                                        ✓
                                      </button>
                                    </div>
                                  </div>
                                )
                              }
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onToggleItem(
                        exerciseIndex,
                        circuitName
                      )
                    }
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-black transition active:scale-95 ${
                      itemComplete
                        ? "border-smc-gold/50 bg-smc-gold/20 text-smc-gold"
                        : "border-white/10 bg-white/[0.035] text-white/35"
                    }`}
                    aria-label={`Mark ${circuitName} complete`}
                  >
                    ✓
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}