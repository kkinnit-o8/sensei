import Link from "next/link";
import { CastGallery } from "./cast-gallery";

export const metadata = { title: "Meet the cast · City Adventures" };

export default function CastPage() {
  return (
    <div className="space-y-4">
      <Link href="/play" className="text-sm text-accent underline">
        ← City Adventures
      </Link>
      <h1 className="text-2xl font-semibold">Meet the cast</h1>
      <CastGallery />
    </div>
  );
}
