export type PlateMode =
  | "calibrated"
  | "gym"

export type BarType =
  | "standard"
  | "womens"
  | "squat"
  | "swiss"
  | "trap"
  | "safety_squat"
  | "custom"

export type BarOption = {
  id: BarType
  label: string
  weight: number
}

export type PlateLoad = {
  weight: number
  quantity: number
}

export type PlateCalculation = {
  targetWeight: number
  barWeight: number
  barType: BarType
  mode: PlateMode
  platesPerSide: PlateLoad[]
  loadedWeight: number
  exact: boolean
  difference: number
}

export const BAR_OPTIONS: BarOption[] = [
  {
    id: "standard",
    label: "20kg Barbell",
    weight: 20,
  },
  {
    id: "womens",
    label: "15kg Women's Bar",
    weight: 15,
  },
  {
    id: "squat",
    label: "25kg Squat Bar",
    weight: 25,
  },
  {
    id: "swiss",
    label: "20kg Swiss Bar",
    weight: 20,
  },
  {
    id: "trap",
    label: "30kg Trap Bar",
    weight: 30,
  },
  {
    id: "safety_squat",
    label: "20kg Safety Squat Bar",
    weight: 20,
  },
  {
    id: "custom",
    label: "Custom Bar",
    weight: 20,
  },
]

export const CALIBRATED_PLATES = [
  25,
  20,
  15,
  10,
  5,
  2.5,
  1.25,
  0.5,
  0.25,
]

export const GYM_PLATES = [
  20,
  15,
  10,
  5,
  2.5,
  1.25,
]

function getAvailablePlates(
  mode: PlateMode
) {
  return mode === "calibrated"
    ? CALIBRATED_PLATES
    : GYM_PLATES
}

export function getBarOption(
  barType: BarType
) {
  return (
    BAR_OPTIONS.find(
      (bar) => bar.id === barType
    ) || BAR_OPTIONS[0]
  )
}

export function calculatePlates({
  targetWeight,
  mode = "calibrated",
  barType = "standard",
  customBarWeight,
}: {
  targetWeight: number
  mode?: PlateMode
  barType?: BarType
  customBarWeight?: number
}): PlateCalculation {
  const target = Number(targetWeight)

  const selectedBar =
    getBarOption(barType)

  const barWeight =
    barType === "custom"
      ? Number(customBarWeight) ||
        selectedBar.weight
      : selectedBar.weight

  if (
    !Number.isFinite(target) ||
    !Number.isFinite(barWeight) ||
    target <= 0 ||
    barWeight <= 0
  ) {
    return {
      targetWeight: 0,
      barWeight:
        barWeight || 20,
      barType,
      mode,
      platesPerSide: [],
      loadedWeight: 0,
      exact: false,
      difference: 0,
    }
  }

  if (target <= barWeight) {
    return {
      targetWeight: target,
      barWeight,
      barType,
      mode,
      platesPerSide: [],
      loadedWeight: barWeight,
      exact:
        Math.abs(
          target - barWeight
        ) < 0.001,
      difference:
        target - barWeight,
    }
  }

  const availablePlates =
    getAvailablePlates(mode)

  let remainingPerSide =
    (target - barWeight) / 2

  const platesPerSide: PlateLoad[] = []

  for (const plate of availablePlates) {
    const quantity = Math.floor(
      (remainingPerSide + 0.0001) /
        plate
    )

    if (quantity > 0) {
      platesPerSide.push({
        weight: plate,
        quantity,
      })

      remainingPerSide -=
        quantity * plate
    }
  }

  const loadedPerSide =
    platesPerSide.reduce(
      (total, plate) =>
        total +
        plate.weight *
          plate.quantity,
      0
    )

  const loadedWeight =
    barWeight +
    loadedPerSide * 2

  const difference =
    target - loadedWeight

  return {
    targetWeight: target,
    barWeight,
    barType,
    mode,
    platesPerSide,
    loadedWeight,
    exact:
      Math.abs(difference) <
      0.001,
    difference,
  }
}