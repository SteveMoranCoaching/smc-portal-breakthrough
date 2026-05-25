import LoadingShell from "@/components/ui/LoadingShell"

export default function Loading() {
  return (
    <LoadingShell
      title="Workout Preview"
      subtitle="Loading the session plan before you start logging."
      cards={4}
    />
  )
}