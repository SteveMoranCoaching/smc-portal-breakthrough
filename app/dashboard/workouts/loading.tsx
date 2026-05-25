import LoadingShell from "@/components/ui/LoadingShell"

export default function Loading() {
  return (
    <LoadingShell
      title="Workouts"
      subtitle="Loading your current training block, sessions and weekly progress."
      cards={5}
    />
  )
}