export type WarmupSet = {
  weight: number
  reps: number
}

export type WarmupResult = {
  targetWeight: number
  sets: WarmupSet[]
  sourceTarget: number
  exactAnchor: boolean
  lowerAnchor: number | null
  upperAnchor: number | null
  confidence: number
}

type WarmupAnchor = {
  target: number
  sets: WarmupSet[]
}

const SMC_WARMUP_ANCHORS: WarmupAnchor[] = [
  {
    target: 40,
    sets: [
      { weight: 20, reps: 5 },
      { weight: 27.5, reps: 3 },
      { weight: 35, reps: 2 },
    ],
  },
  {
    target: 42.5,
    sets: [
      { weight: 20, reps: 5 },
      { weight: 30, reps: 3 },
      { weight: 37.5, reps: 1 },
    ],
  },
  {
    target: 50,
    sets: [
      { weight: 20, reps: 5 },
      { weight: 35, reps: 3 },
      { weight: 45, reps: 2 },
    ],
  },
  {
    target: 57.5,
    sets: [
      { weight: 20, reps: 5 },
      { weight: 35, reps: 3 },
      { weight: 45, reps: 2 },
      { weight: 52.5, reps: 1 },
    ],
  },
  {
    target: 60,
    sets: [
      { weight: 20, reps: 4 },
      { weight: 40, reps: 3 },
      { weight: 52.5, reps: 2 },
    ],
  },
  {
    target: 67.5,
    sets: [
      { weight: 20, reps: 5 },
      { weight: 40, reps: 3 },
      { weight: 55, reps: 2 },
      { weight: 62.5, reps: 1 },
    ],
  },
  {
    target: 72.5,
    sets: [
      { weight: 20, reps: 4 },
      { weight: 45, reps: 3 },
      { weight: 60, reps: 2 },
      { weight: 67.5, reps: 1 },
    ],
  },
  {
    target: 77.5,
    sets: [
      { weight: 40, reps: 4 },
      { weight: 60, reps: 2 },
      { weight: 72.5, reps: 1 },
    ],
  },
  {
    target: 82.5,
    sets: [
      { weight: 40, reps: 3 },
      { weight: 60, reps: 2 },
      { weight: 70, reps: 1 },
      { weight: 77.5, reps: 1 },
    ],
  },
  {
    target: 87.5,
    sets: [
      { weight: 40, reps: 4 },
      { weight: 65, reps: 3 },
      { weight: 80, reps: 1 },
    ],
  },
  {
    target: 95,
    sets: [
      { weight: 40, reps: 4 },
      { weight: 70, reps: 2 },
      { weight: 85, reps: 1 },
    ],
  },
  {
    target: 102.5,
    sets: [
      { weight: 50, reps: 4 },
      { weight: 75, reps: 2 },
      { weight: 92.5, reps: 1 },
    ],
  },
  {
    target: 107.5,
    sets: [
      { weight: 60, reps: 3 },
      { weight: 80, reps: 2 },
      { weight: 100, reps: 1 },
    ],
  },
  {
    target: 112.5,
    sets: [
      { weight: 60, reps: 4 },
      { weight: 80, reps: 3 },
      { weight: 100, reps: 1 },
    ],
  },
  {
    target: 120,
    sets: [
      { weight: 60, reps: 3 },
      { weight: 90, reps: 2 },
      { weight: 110, reps: 1 },
    ],
  },
  {
    target: 127.5,
    sets: [
      { weight: 60, reps: 4 },
      { weight: 90, reps: 3 },
      { weight: 105, reps: 2 },
      { weight: 117.5, reps: 1 },
    ],
  },
  {
    target: 135,
    sets: [
      { weight: 60, reps: 4 },
      { weight: 90, reps: 3 },
      { weight: 110, reps: 2 },
      { weight: 125, reps: 1 },
    ],
  },
  {
    target: 142.5,
    sets: [
      { weight: 60, reps: 4 },
      { weight: 100, reps: 3 },
      { weight: 120, reps: 2 },
      { weight: 132.5, reps: 1 },
    ],
  },
  {
    target: 150,
    sets: [
      { weight: 70, reps: 3 },
      { weight: 110, reps: 2 },
      { weight: 130, reps: 1 },
      { weight: 140, reps: 1 },
    ],
  },
  {
    target: 157.5,
    sets: [
      { weight: 60, reps: 4 },
      { weight: 100, reps: 3 },
      { weight: 125, reps: 2 },
      { weight: 145, reps: 1 },
    ],
  },
  {
    target: 165,
    sets: [
      { weight: 70, reps: 4 },
      { weight: 110, reps: 3 },
      { weight: 130, reps: 2 },
      { weight: 150, reps: 1 },
    ],
  },
  {
    target: 172.5,
    sets: [
      { weight: 70, reps: 5 },
      { weight: 110, reps: 3 },
      { weight: 140, reps: 2 },
      { weight: 160, reps: 1 },
    ],
  },
  {
    target: 180,
    sets: [
      { weight: 70, reps: 5 },
      { weight: 120, reps: 3 },
      { weight: 160, reps: 2 },
    ],
  },
  {
    target: 187.5,
    sets: [
      { weight: 70, reps: 5 },
      { weight: 120, reps: 3 },
      { weight: 150, reps: 2 },
      { weight: 172.5, reps: 1 },
    ],
  },
  {
    target: 195,
    sets: [
      { weight: 70, reps: 4 },
      { weight: 120, reps: 3 },
      { weight: 150, reps: 2 },
      { weight: 180, reps: 1 },
    ],
  },
  {
    target: 202.5,
    sets: [
      { weight: 70, reps: 5 },
      { weight: 120, reps: 3 },
      { weight: 170, reps: 2 },
      { weight: 190, reps: 1 },
    ],
  },
  {
    target: 210,
    sets: [
      { weight: 70, reps: 5 },
      { weight: 120, reps: 3 },
      { weight: 150, reps: 2 },
      { weight: 180, reps: 2 },
      { weight: 200, reps: 1 },
    ],
  },
  {
    target: 217.5,
    sets: [
      { weight: 70, reps: 5 },
      { weight: 120, reps: 3 },
      { weight: 170, reps: 2 },
      { weight: 200, reps: 1 },
    ],
  },
  {
    target: 225,
    sets: [
      { weight: 70, reps: 5 },
      { weight: 120, reps: 3 },
      { weight: 170, reps: 2 },
      { weight: 200, reps: 1 },
      { weight: 215, reps: 1 },
    ],
  },
  {
    target: 232.5,
    sets: [
      { weight: 70, reps: 5 },
      { weight: 120, reps: 3 },
      { weight: 170, reps: 2 },
      { weight: 200, reps: 1 },
      { weight: 220, reps: 1 },
    ],
  },
  {
    target: 240,
    sets: [
      { weight: 70, reps: 5 },
      { weight: 120, reps: 4 },
      { weight: 170, reps: 3 },
      { weight: 200, reps: 1 },
      { weight: 225, reps: 1 },
    ],
  },
  {
    target: 245,
    sets: [
      { weight: 70, reps: 5 },
      { weight: 120, reps: 3 },
      { weight: 170, reps: 2 },
      { weight: 210, reps: 1 },
      { weight: 230, reps: 1 },
    ],
  },
  {
    target: 250,
    sets: [
      { weight: 70, reps: 5 },
      { weight: 120, reps: 4 },
      { weight: 170, reps: 3 },
      { weight: 200, reps: 2 },
      { weight: 220, reps: 1 },
      { weight: 240, reps: 1 },
    ],
  },
  {
    target: 255,
    sets: [
      { weight: 120, reps: 3 },
      { weight: 170, reps: 2 },
      { weight: 210, reps: 1 },
      { weight: 240, reps: 1 },
    ],
  },
  {
    target: 260,
    sets: [
      { weight: 70, reps: 5 },
      { weight: 120, reps: 4 },
      { weight: 170, reps: 3 },
      { weight: 200, reps: 2 },
      { weight: 225, reps: 1 },
      { weight: 245, reps: 1 },
    ],
  },
  {
    target: 265,
    sets: [
      { weight: 120, reps: 3 },
      { weight: 170, reps: 2 },
      { weight: 220, reps: 1 },
      { weight: 245, reps: 1 },
    ],
  },
  {
    target: 270,
    sets: [
      { weight: 70, reps: 5 },
      { weight: 120, reps: 4 },
      { weight: 170, reps: 3 },
      { weight: 210, reps: 2 },
      { weight: 240, reps: 1 },
      { weight: 260, reps: 1 },
    ],
  },
  {
    target: 275,
    sets: [
      { weight: 120, reps: 3 },
      { weight: 170, reps: 3 },
      { weight: 220, reps: 2 },
      { weight: 250, reps: 1 },
    ],
  },
  {
    target: 280,
    sets: [
      { weight: 120, reps: 4 },
      { weight: 170, reps: 3 },
      { weight: 210, reps: 2 },
      { weight: 240, reps: 2 },
      { weight: 265, reps: 1 },
    ],
  },
]

function roundToIncrement(
  value: number,
  increment = 2.5
) {
  return (
    Math.round(value / increment) *
    increment
  )
}

function findLowerAnchor(
  targetWeight: number
) {
  const lowerAnchors =
    SMC_WARMUP_ANCHORS.filter(
      (anchor) =>
        anchor.target < targetWeight
    )

  if (lowerAnchors.length === 0) {
    return SMC_WARMUP_ANCHORS[0]
  }

  return lowerAnchors[
    lowerAnchors.length - 1
  ]
}

function findUpperAnchor(
  targetWeight: number
) {
  const upperAnchor =
    SMC_WARMUP_ANCHORS.find(
      (anchor) =>
        anchor.target > targetWeight
    )

  return (
    upperAnchor ||
    SMC_WARMUP_ANCHORS[
      SMC_WARMUP_ANCHORS.length - 1
    ]
  )
}

export function generateSteveMoranWarmup(
  targetWeight: number,
  roundingIncrement = 2.5
): WarmupResult {
  const target = Number(targetWeight)

  if (
    !Number.isFinite(target) ||
    target <= 0
  ) {
    return {
  targetWeight: 0,
  sets: [],
  sourceTarget: 0,
  exactAnchor: false,
  lowerAnchor: null,
  upperAnchor: null,
  confidence: 0,
}
  }

  const exactAnchor =
    SMC_WARMUP_ANCHORS.find(
      (anchor) => anchor.target === target
    )

  if (exactAnchor) {
    return {
  targetWeight: target,
  sourceTarget: exactAnchor.target,
  exactAnchor: true,
  lowerAnchor: exactAnchor.target,
  upperAnchor: exactAnchor.target,
  confidence: 100,
  sets: exactAnchor.sets.map((set) => ({
    ...set,
  })),
}
  }

  const lowerAnchor =
  findLowerAnchor(target)

const upperAnchor =
  findUpperAnchor(target)

const anchorRange =
  upperAnchor.target - lowerAnchor.target

const nearestDistance = Math.min(
  Math.abs(target - lowerAnchor.target),
  Math.abs(upperAnchor.target - target)
)

const confidence =
  anchorRange <= 0
    ? 100
    : Math.max(
        75,
        Math.round(
          100 -
            (nearestDistance / anchorRange) * 20
        )
      )  

const lowerDifference =
  target - lowerAnchor.target

const upperDifference =
  upperAnchor.target - target

const sourceAnchor =
  lowerDifference <= upperDifference
    ? lowerAnchor
    : upperAnchor

const targetDifference =
  target - sourceAnchor.target

const sets = sourceAnchor.sets
  .map((set, index) => {
    const isFinalSet =
      index === sourceAnchor.sets.length - 1

    const adjustmentRatio =
      isFinalSet ? 0.8 : 0.45

    const adjustedWeight =
      set.weight +
      targetDifference * adjustmentRatio

    return {
      reps: set.reps,
      weight: roundToIncrement(
        adjustedWeight,
        roundingIncrement
      ),
    }
  })
  .filter(
    (set) =>
      set.weight > 0 &&
      set.weight < target
  )

return {
  targetWeight: target,
  sourceTarget: sourceAnchor.target,
  exactAnchor: false,
  lowerAnchor: lowerAnchor.target,
  upperAnchor: upperAnchor.target,
  confidence,
  sets,
}
}

export {
  SMC_WARMUP_ANCHORS,
}