import LoadingShell from "@/components/ui/LoadingShell"

export default function Loading() {
  return (
    <LoadingShell
      title="Exercise Breakdown"
      subtitle="Loading the full progression view for this exercise."
      cards={5}
    />
  )
}