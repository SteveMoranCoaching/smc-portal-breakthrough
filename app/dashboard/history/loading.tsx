import LoadingShell from "@/components/ui/LoadingShell"

export default function Loading() {
  return (
    <LoadingShell
      title="Exercise History"
      subtitle="Building your progression overview — PBs, trends and exercise data."
      cards={6}
    />
  )
}