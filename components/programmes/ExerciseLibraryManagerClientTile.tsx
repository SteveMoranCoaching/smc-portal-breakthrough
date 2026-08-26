"use client"

import { useState } from "react"
import ExerciseLibraryManagerTile from "./ExerciseLibraryManagerTile"

type ExerciseLibraryManagerClientTileProps = {
  exerciseName: string
  movement?: string | null
  equipment?: string | null
  hasVideo?: boolean
  hasCoachNotes?: boolean
  favourite?: boolean
  children: React.ReactNode
}

export default function ExerciseLibraryManagerClientTile({
  exerciseName,
  movement,
  equipment,
  hasVideo,
  hasCoachNotes,
  favourite,
  children,
}: ExerciseLibraryManagerClientTileProps) {
  const [open, setOpen] = useState(false)

  return (
    <ExerciseLibraryManagerTile
      exerciseName={exerciseName}
      movement={movement}
      equipment={equipment}
      hasVideo={hasVideo}
      hasCoachNotes={hasCoachNotes}
      favourite={favourite}
      isOpen={open}
      onToggle={() => setOpen((current) => !current)}
    >
      {children}
    </ExerciseLibraryManagerTile>
  )
}