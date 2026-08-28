import { CitizenJourney } from "@/components/citizen-journey";

export default async function DemoCasePage({
  params,
}: PageProps<"/case/[caseId]">) {
  const { caseId } = await params;
  return <CitizenJourney requestedCaseId={caseId} />;
}
