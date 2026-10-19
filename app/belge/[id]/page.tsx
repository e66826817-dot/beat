import Link from "next/link";
import { notFound } from "next/navigation";
import BelgeMetni from "../../../components/BelgeMetni";
import {
  BELGELER,
  BELGE_SURUMU,
  GUNCELLEME,
  belgeBul,
  taslakMi,
} from "../../../lib/belgeler";

export default async function BelgeSayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const belge = belgeBul(id);
  if (!belge) notFound();

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      {taslakMi() && (
        <p className="rounded-2xl border border-yellow-500 bg-card p-3 text-sm text-yellow-500">
        </p>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {BELGELER.map((b) => (
          <Link
            key={b.id}
            href={`/belge/${b.id}`}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              b.id === belge.id ? "btn-brand" : "bg-card2 text-muted hover:text-ink"
            }`}
          >
            {b.baslik}
          </Link>
        ))}
      </div>

      <section className="space-y-4 rounded-3xl border border-line bg-card p-5">
        <div>
          <h1 className="text-2xl font-extrabold">{belge.baslik}</h1>
          <p className="text-xs text-muted">
            Son güncelleme: {GUNCELLEME} · Sürüm {BELGE_SURUMU}
          </p>
        </div>
        <BelgeMetni belge={belge} />
      </section>
    </main>
  );
}