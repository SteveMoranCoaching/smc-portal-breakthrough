export function getWarmupKey(exerciseIndex: number, exerciseName: string) {
    return `${exerciseIndex}-${exerciseName}`
  }

export function getStretchKey(exerciseIndex: number, exerciseName: string) {
    return `${exerciseIndex}-${exerciseName}`
  }

export function getCircuitKey(exerciseIndex: number, circuitName: string) {
  return `${exerciseIndex}-${circuitName}`
}  

export function getCircuitExerciseKey(
  exerciseIndex: number,
  circuitName: string,
  circuitExerciseIndex: number,
  circuitExerciseName: string
) {
  return `${exerciseIndex}-${circuitName}-${circuitExerciseIndex}-${circuitExerciseName}`
}

export function getSetKey(
  exerciseIndex: number,
  setIndex: number
) {
  return `${exerciseIndex}-${setIndex}`
}