import { connection } from "next/server";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings · Chinese Teacher" };

export default async function SettingsPage() {
  await connection();
  return <SettingsForm keyConfigured={!!process.env.OPENROUTER_API_KEY} />;
}
