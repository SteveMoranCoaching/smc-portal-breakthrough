export type CoachingMovement =
  | "squat"
  | "bench"
  | "deadlift"

export type CoachingObjective =
  | "technique"
  | "strength"
  | "peak_strength"
  | "volume"
  | "hypertrophy"
  | "recovery"

export type CoachingCueLibrary = {
  technique: Partial<
    Record<CoachingMovement, string[]>
  >
  volume: {
    general: string[]
  }
  peakStrength: {
    general: string[]
  }
  strength: {
  general: string[]
  }
  hypertrophy: {
  general: string[]
  }
  recovery: {
  general: string[]
  }
}

export const SMC_COACHING_LIBRARY: CoachingCueLibrary = {
  technique: {
    squat: [
      "Get your stance set.",
      "Deep breath.",
      "Open hips, knees out.",
      "Eyes forward.",
      "Strong chest as you drive out the hole.",
    ],

    bench: [
      "Feet set.",
      "Tight upper back.",
      "Pull the bar to your chest.",
      "Drive through your heels.",
      "Press up and back.",
    ],

    deadlift: [
      "Toes forward.",
      "Shoulders back and down.",
      "Eyes forward.",
      "Squeeze the bar off the floor.",
      "Drive the floor away.",
      "Big chest.",
      "Hips through, squeeze glutes.",
    ],
  },

  volume: {
    general: [
      "Every rep should look the same.",
      "Keep the early sets controlled and comfortable.",
      "Stay technically proficient as fatigue builds.",
      "Do not turn the session into a test.",
      "The goal is quality work across the full prescription.",
    ],
  },

  peakStrength: {
  general: [
    "Take your time and treat the top set as the priority.",
    "Build confidence through the warm-ups.",
    "Stay composed as the weight gets heavier.",
    "Commit fully to the attempt.",
    "Do not waste energy before the performance set.",
  ],
},

strength: {
  general: [
    "Move every working set with intent.",
    "Stay technically disciplined as load increases.",
    "Keep enough in reserve to complete the full prescription well.",
    "Treat the work as strength training, not a max test.",
    "Make the final set look as controlled as the first.",
  ],
},

hypertrophy: {
  general: [
    "Control the movement from start to finish.",
    "Keep tension where the exercise is intended to work.",
    "Use the full range you can control well.",
    "Do not sacrifice execution just to add load.",
    "Keep the target muscle doing the work as fatigue builds.",
  ],
},

recovery: {
  general: [
    "Keep the session deliberately comfortable.",
    "Prioritise movement quality over load.",
    "Stay smooth and controlled throughout.",
    "Do not chase fatigue.",
    "Finish feeling better than you started.",
  ],
},
}