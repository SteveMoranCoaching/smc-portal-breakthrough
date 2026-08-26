import type {
  PlateLoad,
  PlateMode,
} from "@/lib/plateCalculator"

type PlateStackProps = {
  plates: PlateLoad[]
  mode: PlateMode
  barWeight: number
  targetWeight: number
}

function getPlateColour(
  weight: number,
  mode: PlateMode
) {
  if (mode === "gym") {
  return {
    background: "#171717",
    border: "#3f3f46",
    text: "#ffffff",
  }
}

  switch (weight) {
    case 25:
      return {
        background: "#dc2626",
        border: "#ef4444",
        text: "#ffffff",
      }

    case 20:
      return {
        background: "#2563eb",
        border: "#3b82f6",
        text: "#ffffff",
      }

    case 15:
      return {
        background: "#eab308",
        border: "#facc15",
        text: "#050505",
      }

    case 10:
      return {
        background: "#16a34a",
        border: "#22c55e",
        text: "#ffffff",
      }

    case 5:
      return {
        background: "#e5e7eb",
        border: "#ffffff",
        text: "#050505",
      }

    case 2.5:
  return {
    background: "#050505",
    border: "#737373",
    text: "#ffffff",
  }

case 1.25:
  return {
    background: "#a3a3a3",
    border: "#d4d4d4",
    text: "#050505",
  }

    case 0.5:
      return {
        background: "#f3f4f6",
        border: "#ffffff",
        text: "#050505",
      }

    case 0.25:
      return {
        background: "#525252",
        border: "#737373",
        text: "#ffffff",
      }

    default:
      return {
        background: "#262626",
        border: "#525252",
        text: "#ffffff",
      }
  }
}

function getPlateHeight(
  weight: number,
  mode: PlateMode
) {
  if (mode === "calibrated") {
  if (weight >= 20) return 100
  if (weight >= 15) return 92
  if (weight >= 10) return 84
  if (weight >= 5) return 72
  if (weight >= 2.5) return 58
  if (weight >= 1.25) return 50
  return 44
}

  if (weight >= 20) return 100
  if (weight >= 15) return 88
  if (weight >= 10) return 78
  if (weight >= 5) return 68
  if (weight >= 2.5) return 58
  if (weight >= 1.25) return 50
  return 44
}

function getPlateWidth(
  weight: number,
  mode: PlateMode
) {
  if (mode === "gym") {
    return 18
  }

  if (weight >= 25) return 18
  if (weight >= 20) return 16
  if (weight >= 15) return 14
  if (weight >= 10) return 12
  if (weight >= 5) return 10
  if (weight >= 2.5) return 9
  return 8
}

export default function PlateStack({
  plates,
  mode,
  barWeight,
  targetWeight,
}: PlateStackProps) {
  const expandedPlates = plates.flatMap(
    (plate) =>
      Array.from(
        { length: plate.quantity },
        (_, index) => ({
          weight: plate.weight,
          key: `${plate.weight}-${index}`,
        })
      )
  )

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-black/30 p-4">
      <div className="flex items-end justify-between gap-3">
        <div>

          <p className="text-xl font-black text-white">
            {targetWeight}kg
          </p>
        </div>

        <p className="text-[9px] font-bold text-white/30">
          {barWeight}kg bar
        </p>
      </div>

      <div className="mt-5 overflow-x-auto pb-2">
  <div className="flex min-w-max items-center">
    {/* Bar shaft */}
    <div className="h-[6px] w-20 rounded-l-full bg-gradient-to-r from-white/10 to-white/35" />

    {/* Sleeve shoulder */}
    <div className="h-8 w-3 rounded-l-sm border border-white/15 bg-white/25" />

    {/* Sleeve under plates */}
    <div className="relative flex h-28 items-center">
      <div className="absolute left-0 right-0 top-1/2 h-[10px] -translate-y-1/2 border-y border-white/10 bg-gradient-to-b from-white/30 via-white/15 to-white/25" />

      <div className="relative z-10 flex items-center gap-[3px]">
        {expandedPlates.length > 0 ? (
          expandedPlates.map((plate) => {
            const colours =
              getPlateColour(
                plate.weight,
                mode
              )

            return (
              <div
                key={plate.key}
                className="flex shrink-0 items-center justify-center border"
                style={{
                  height: `${getPlateHeight(
  plate.weight,
  mode
)}px`,
width: `${getPlateWidth(
  plate.weight,
  mode
)}px`,
                  backgroundColor:
                    colours.background,
                  borderColor:
                    colours.border,
                  color: colours.text,
                }}
              >
                <span className="whitespace-nowrap text-[8px] font-black">
                    {plate.weight}
                </span>
              </div>
            )
          })
        ) : (
          <p className="ml-3 text-[10px] font-bold text-white/25">
            Bar only
          </p>
        )}
      </div>
    </div>

{/* Short outer sleeve */}
<div className="h-[8px] w-10 bg-gradient-to-r from-white/25 to-white/10" />
  </div>
</div>

      <div className="mt-3 border-t border-white/[0.05] pt-3">
        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/25">
          Per Side
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-2">
  {plates.length > 0 ? (
  plates.map((plate) => {
    const colours =
      getPlateColour(
        plate.weight,
        mode
      )

    return (
      <span
        key={plate.weight}
        className="rounded-full border px-2 py-1 text-[9px] font-black"
        style={{
          backgroundColor:
            colours.background,
          borderColor:
            colours.border,
          color:
            colours.text,
        }}
      >
        {plate.weight}kg × {plate.quantity}
      </span>
    )
  })
) : (
            <p className="text-[10px] font-bold text-white/30">
              No plates required
            </p>
          )}
        </div>
      </div>
    </div>
  )
}