import { Card, ButtonLink, StepHeader } from "@/components/ui";

export default function ChatPage() {
  return (
    <div>
      <StepHeader step={4} title="Conversation" />
      <Card className="space-y-3">
        <p>The AI teacher chat arrives in the next phase of the build.</p>
        <ButtonLink href="/" variant="secondary">
          Back to today
        </ButtonLink>
      </Card>
    </div>
  );
}
