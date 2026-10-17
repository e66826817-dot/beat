"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";

type Grup = {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  description: string | null;
  debut_year: number | null;
  cover_url: string | null;
  group_follows: { user_id: string }[];
};

function turEtiketi(tur: string | null) {
  if (tur === "boyband") return "Boyband";
  if (tur === "girlband") return "Girlband";
  return "Karma";
    if (tur === "solo") return "Solo";
}

export default function GruplarSayfasi() {
  const supabase = createClient();
  const [gruplar, setGruplar] = useState<Grup[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");
  const [filtre, setFiltre] = useState<"hepsi" | "boyband" | "girlband" | "karma" | "solo">("hepsi");

  useEffect(() => {
    async function getir() {
      const { data, error } = await supabase
        .from("groups")
        .select(
          "id, name, slug, type, description, debut_year, cover_url, group_follows(user_id)"
        )
        .order("name");
      if (error) setHata(error.message);
      else
        setGruplar(
          ((data as unknown as Grup[]) || []).map((g) => ({
            ...g,
            group_follows: g.group_follows ?? [],
          }))
        );
      setYukleniyor(false);
    }
    getir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gosterilen =
    filtre === "hepsi" ? gruplar : gruplar.filter((g) => g.type === filtre);

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <div>
        <h2 className="text-2xl font-extrabold">Gruplar</h2>
        <p className="text-sm text-muted">
          Sevdiğin grupları keşfet ve takip et.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["hepsi", "Hepsi"],
            ["boyband", "Boyband"],
            ["girlband", "Girlband"],
            ["karma", "Karma"],
            ["solo", "Solo"],
          ] as const
        ).map(([anahtar, etiket]) => (
          <button
            key={anahtar}
            onClick={() => setFiltre(anahtar)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filtre === anahtar
                ? "btn-brand"
                : "bg-card2 text-muted hover:text-ink"
            }`}
          >
            {etiket}
          </button>
        ))}
      </div>

      {hata && (
        <p className="rounded-xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}

      {yukleniyor && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl border border-line bg-card"
            />
          ))}
        </div>
      )}

      {!yukleniyor && gosterilen.length === 0 && !hata && (
        <div className="rounded-2xl border border-dashed border-line py-12 text-center text-muted">
          <p className="text-4xl">🎤</p>
          <p className="mt-2">Bu kategoride henüz grup yok.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {gosterilen.map((g) => (
          <Link
            key={g.id}
            href={`/gruplar/${g.slug}`}
            className="group overflow-hidden rounded-2xl border border-line bg-card transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            {g.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={g.cover_url}
                alt={g.name}
                className="h-32 w-full object-cover"
              />
            ) : (
              <div className="btn-brand flex h-32 items-center justify-center text-5xl font-extrabold opacity-90">
                {g.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="space-y-1 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold group-hover:text-brand">{g.name}</span>
                <span className="rounded-full bg-card2 px-2 py-0.5 text-xs text-brand">
                  {turEtiketi(g.type)}
                </span>
              </div>
              <p className="text-xs text-muted">
                {g.debut_year ? `${g.debut_year} · ` : ""}
                {g.group_follows.length} takipçi
              </p>
              {g.description && (
                <p className="line-clamp-2 text-sm text-muted">{g.description}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}