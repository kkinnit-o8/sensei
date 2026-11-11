import { Card, ButtonLink, StepHeader } from "@/components/ui";

export default function SummaryPage() {
  return (
    <div>
      <StepHeader step={5} title="Summary" />
      <Card className="space-y-3">
        <p>The daily summary arrives in a later phase of the build.</p>
        <ButtonLink href="/" variant="secondary">
          Back to today
        </ButtonLink>
      </Card>
    </div>
  );
}
