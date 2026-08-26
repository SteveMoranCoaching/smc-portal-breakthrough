type ExerciseMetadataFieldsProps = {
  defaultSection?: string | null
  defaultPrimaryLog?: string | null
  defaultSecondaryLog?: string | null
  movement?: string | null
  equipment?: string | null
  warmupProfile?: string | null
  isFavourite?: boolean
  compact?: boolean
}

const movementOptions = [
  "Squat",
  "Bench",
  "Deadlift",
  "Chest",
  "Back",
  "Shoulders",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Biceps",
  "Triceps",
  "Core",
  "Conditioning",
  "Warm Up",
  "Stretch",
  "Mobility",
]

const equipmentOptions = [
  "Barbell",
  "Dumbbell",
  "Cable",
  "Machine",
  "Bodyweight",
  "Band",
  "Kettlebell",
  "Sled",
  "Cardio",
  "Other",
]

const inputStyle =
  "min-h-[44px] w-full rounded-[1rem] border border-[rgba(255,255,255,0.08)] bg-black/40 px-3 text-sm font-semibold text-white outline-none focus:border-smc-gold/70"

const labelStyle =
  "text-[9px] font-black uppercase tracking-[0.2em] text-white/35"

export default function ExerciseMetadataFields({
  defaultSection = "main",
  defaultPrimaryLog = "kg",
  defaultSecondaryLog = "reps",
  movement = "",
  equipment = "",
  warmupProfile = "none",
  isFavourite = false,
  compact = false,
}: ExerciseMetadataFieldsProps) {
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <label className={labelStyle}>
            Default section
          </label>

          <select
            name="defaultSection"
            defaultValue={defaultSection || "main"}
            className={`mt-1.5 ${inputStyle}`}
          >
            <option value="main">Main Exercise</option>
            <option value="warmup">
              Warm-up / Mobility
            </option>
            <option value="superset">Superset</option>
            <option value="circuit">Circuit</option>
            <option value="stretch">
              Post Session Stretch
            </option>
          </select>
        </div>

        <div>
          <label className={labelStyle}>
            Primary log
          </label>

          <select
            name="defaultPrimaryLog"
            defaultValue={defaultPrimaryLog || "kg"}
            className={`mt-1.5 ${inputStyle}`}
          >
            <option value="kg">Kg</option>
            <option value="bodyweight">
              Bodyweight
            </option>
            <option value="height">Height</option>
            <option value="speed">Speed</option>
            <option value="distance">Distance</option>
            <option value="none">None</option>
          </select>
        </div>

        <div>
          <label className={labelStyle}>
            Secondary log
          </label>

          <select
            name="defaultSecondaryLog"
            defaultValue={
              defaultSecondaryLog || "reps"
            }
            className={`mt-1.5 ${inputStyle}`}
          >
            <option value="reps">Reps</option>
            <option value="time">Time</option>
            <option value="distance">Distance</option>
            <option value="calories">Calories</option>
            <option value="rounds">Rounds</option>
            <option value="none">None</option>
          </select>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className={labelStyle}>
            Movement
          </label>

          <select
            name="movement"
            defaultValue={movement || ""}
            className={`mt-1.5 ${inputStyle}`}
          >
            <option value="">
              Select movement
            </option>

            {movementOptions.map((option) => (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelStyle}>
            Equipment
          </label>

          <select
            name="equipment"
            defaultValue={equipment || ""}
            className={`mt-1.5 ${inputStyle}`}
          >
            <option value="">
              Select equipment
            </option>

            {equipmentOptions.map((option) => (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
  <label className={labelStyle}>
    Warm-up Profile
  </label>

  <select
    name="warmupProfile"
    defaultValue={warmupProfile || "none"}
    className={`mt-1.5 ${inputStyle}`}
  >
    <option value="none">None</option>
    <option value="competition_lift">Competition Lift</option>
    <option value="accessory_lift">Accessory Lift</option>
    <option value="dumbbell">Dumbbell</option>
    <option value="machine">Machine</option>
    <option value="bodyweight">Bodyweight</option>
    <option value="conditioning">Conditioning</option>
  </select>
</div>

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[1rem] border border-white/[0.08] bg-black/30 px-4 py-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-smc-gold">
            Favourite
          </p>

          <p className="mt-1 text-xs text-white/35">
            Pin this exercise near the top of the
            programme-builder library.
          </p>
        </div>

        <input
          type="checkbox"
          name="isFavourite"
          defaultChecked={isFavourite}
          className="h-5 w-5 accent-[#d4af37]"
        />
      </label>
    </div>
  )
}

export {
  movementOptions,
  equipmentOptions,
}