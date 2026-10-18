"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { Avatar } from "../../components/PostCard";

type Satir = {
  uid: string;
  ad: string;
  avatar: string | null;
  cerceve: string | null;
  puan: number;
};

type Donem = "hafta" | "ay" | "tum";

const DONEMLER: [Donem, string][] = [
  ["hafta", "Bu hafta"],
  ["ay", "Bu ay"],
  ["tum", "Tüm zamanlar"],
];

const MADALYA = ["🥇", "🥈", "🥉"];

export default function LiderlikSayfasi() {
  const supabase = createClient();
  const [donem, setDonem] = useState<Donem>("hafta");
  const [liste, setListe] = useState<Satir[]>([]);
  const [benimId, setBenimId] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");

  async function getir(d: Donem) {
    setYukleniyor(true);
    setHata("");
    const { data, error } = await supabase.rpc("liderlik", { donem: d });
    if (error) setHata(error.message);
    else setListe((data as Satir[]) || []);
    setYukleniyor(false);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setBenimId(data.user?.id ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getir(donem);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donem]);

  const benimSiram = liste.findIndex((s) => s.uid === benimId);

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <section className="btn-brand rounded-3xl p-6">
        <h2 className="text-2xl font-extrabold">🏆 Liderlik</h2>
        <p className="mt-1 text-sm opacity-90">
          Günlük görev puanları ve kazanılan ödüllerle sıralanır. Her ödül 20
          puan.
        </p>
      </section>

      <div className="flex gap-2 overflow-x-auto">
        {DONEMLER.map(([a, e]) => (
          <button
            key={a}
            onClick={() => setDonem(a)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              donem === a ? "btn-brand" : "bg-card2 text-muted hover:text-ink"
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      {benimId && !yukleniyor && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm">
          {benimSiram >= 0
            ? `Sıran: #${benimSiram + 1} · ${liste[benimSiram].puan} puan`
            : "İlk 50'de değilsin. Görev yaparak puan kazan!"}{" "}
          <Link href="/gorevler" className="font-semibold text-brand">
            Görevlere git →
          </Link>
        </p>
      )}

      {hata && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}

      {yukleniyor ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl border border-line bg-card"
            />
          ))}
        </div>
      ) : liste.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line py-12 text-center text-muted">
          <p className="text-4xl">🏆</p>
          <p className="mt-2 px-4">Bu dönemde henüz puan alan yok.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {liste.map((s, i) => (
            <Link
              key={s.uid}
              href={`/profil/${s.ad}`}
              className={`flex items-center gap-3 rounded-2xl border bg-card p-3 transition hover:-translate-y-0.5 ${
                s.uid === benimId ? "border-brand" : "border-line"
              }`}
            >
              <span className="w-9 text-center text-xl font-extrabold">
                {MADALYA[i] ?? i + 1}
              </span>
              <Avatar
                url={s.avatar}
                ad={s.ad}
                boyut="h-11 w-11"
                cerceve={s.cerceve}
              />
              <span className="min-w-0 flex-1 truncate font-semibold">
                @{s.ad}
              </span>
              <span className="rounded-full bg-card2 px-3 py-1 text-sm font-bold text-brand">
                {s.puan}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}