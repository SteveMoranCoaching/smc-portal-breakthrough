import ProgrammeEditor from "@/components/ProgrammeEditor"

export const dynamic = "force-dynamic"

export default async function EditProgrammePage({
  params,
}: {
  params: Promise<{ programmeId: string }>
}) {
  const { programmeId } = await params

  return <ProgrammeEditor programmeId={programmeId} />
}