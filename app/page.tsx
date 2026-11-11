import Link from "next/link";
import { connection } from "next/server";
import { loadBank } from "@/lib/server/words";
import { getDictDb, headwords } from "@/lib/server/dict";

export default async function Home() {
  await connection();
  const bank = loadBank();
  const withExample = bank.words.filter((w) => w.example).length;
  const dictOk = !!getDictDb();
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-6">
        <h1 className="text-2xl font-semibold">Today</h1>
        <p className="mt-2 text-muted">The daily session (review, learn, quiz, conversation, summary) is being built.</p>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Words in the word bank" value={bank.words.length.toLocaleString()} />
        <Stat label="With example sentences" value={withExample.toLocaleString()} />
        <Stat label="Dictionary entries" value={dictOk ? headwords().size.toLocaleString() : "not imported"} />
      </section>
      <p className="text-sm text-muted">
        Browse the <Link className="text-accent underline" href="/words">word list</Link> or read{" "}
        <Link className="text-accent underline" href="/about">about the data</Link>.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}
