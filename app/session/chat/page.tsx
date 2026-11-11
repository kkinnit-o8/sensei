import { connection } from "next/server";
import { now } from "@/lib/server/clock";
import { dailyConversation } from "@/lib/server/chat";
import { chatView } from "@/lib/server/chat-view";
import { getSettings } from "@/lib/server/settings";
import { studyDay } from "@/lib/day";
import { StepHeader } from "@/components/ui";
import { Conversation } from "@/components/chat/Conversation";
import { StartChat } from "@/components/chat/StartChat";

export default async function ChatPage() {
  await connection();
  const conv = dailyConversation(studyDay(now()));
  const view = conv ? chatView(conv.id) : null;
  return (
    <div>
      <StepHeader step={4} title="Conversation" />
      {view ? (
        <Conversation
          initial={view}
          initialError={view.awaitingReply ? { kind: "pending", message: "The teacher hasn't replied yet." } : null}
        />
      ) : (
        <StartChat exchanges={getSettings().exchangesPerDay} />
      )}
    </div>
  );
}
