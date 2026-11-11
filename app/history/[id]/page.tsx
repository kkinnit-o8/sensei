import Link from "next/link";
import { notFound } from "next/navigation";
import { chatView } from "@/lib/server/chat-view";
import { Conversation } from "@/components/chat/Conversation";

export default async function PastConversation({ params }: PageProps<"/history/[id]">) {
  const { id } = await params;
  const view = chatView(Number(id));
  if (!view) notFound();
  return (
    <div className="space-y-4">
      <Link href="/history" className="text-sm text-accent underline">
        ← All conversations
      </Link>
      <h1 className="text-2xl font-semibold">Conversation of {view.studyDay}</h1>
      <Conversation initial={view} readOnly />
    </div>
  );
}
