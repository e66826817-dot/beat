"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase";
import { hataCevir } from "./PostCard";

type Anket = {
  id: string;
  question: string;
  poll_options: { id: string; label: string; sort_order: number }[];
  poll_votes: { user_id: string; option_id: string }[];
};

export default function AnasayfaAnket({
  kullaniciId,
}: {
  kullaniciId: string | null;
}) {
  const supabase = createClient();
  const [anket, setAnket] = useState<Anket | null>(null);
  const [hata, setHata] = useState("");

  async function getir() {
    const { data } = await supabase
      .from("polls")
      .select(
        "id, question, poll_options!poll_options_poll_id_fkey(id, label, sort_order), poll_votes!poll_votes_poll_id_fkey(user_id, option_id)"
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) {
      setAnket(null);
      return;
    }
    const a = data as unknown as Anket;
    setAnket({
      ...a,
      poll_options: (a.poll_options ?? []).sort(
        (x, y) => x.sort_order - y.sort_order
      ),
      poll_votes: a.poll_votes ?? [],
    });
  }

  useEffect(() => {
    getir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kullaniciId]);

  async function oyVer(optionId: string) {
    if (!anket || !kullaniciId) return;
    setHata("");
    const { error } = await supabase.from("poll_votes").insert({
      poll_id: anket.id,
      user_id: kullaniciId,
      option_id: optionId,
    });
    if (error)
      setHata(
        error.message.includes("duplicate")
          ? "Bu ankete zaten oy verdin."
          : hataCevir(error.message)
      );
    await getir();
  }

  if (!anket) return null;
  const toplam = anket.poll_votes.length;
  const benim = anket.poll_votes.find((v) => v.user_id === kullaniciId);

  return (
    <section className="space-y-3 rounded-3xl border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-brand">📊 Anket</p>
          <h3 className="font-extrabold">{anket.question}</h3>
        </div>
        <Link
          href="/anketler"
          className="shrink-0 text-xs font-semibold text-muted hover:text-ink"
        >
          Tümü →
        </Link>
      </div>

      <div className="space-y-2">
        {anket.poll_options.map((o) => {
          const sayi = anket.poll_votes.filter((v) => v.option_id === o.id).length;
          const yuzde = toplam ? Math.round((sayi / toplam) * 100) : 0;

          if (benim) {
            return (
              <div
                key={o.id}
                className={`relative overflow-hidden rounded-2xl bg-card2 ${
                  benim.option_id === o.id ? "ring-2 ring-brand" : ""
                }`}
              >
                <div
                  className="btn-brand absolute inset-y-0 left-0 opacity-30"
                  style={{ width: `${yuzde}%` }}
                />
                <div className="relative flex justify-between px-4 py-2.5 text-sm">
                  <span className="font-medium">
                    {benim.option_id === o.id && "✓ "}
                    {o.label}
                  </span>
                  <span className="text-muted">%{yuzde}</span>
                </div>
              </div>
            );
          }

          return kullaniciId ? (
            <button
              key={o.id}
              onClick={() => oyVer(o.id)}
              className="w-full rounded-2xl bg-card2 px-4 py-2.5 text-left text-sm font-medium transition hover:ring-2 hover:ring-brand"
            >
              {o.label}
            </button>
          ) : (
            <Link
              key={o.id}
              href="/giris"
              className="block rounded-2xl bg-card2 px-4 py-2.5 text-sm font-medium"
            >
              {o.label}
            </Link>
          );
        })}
      </div>

      {hata && <p className="text-sm text-yellow-500">{hata}</p>}
      <p className="text-xs text-muted">
        {toplam} oy{!kullaniciId && " · Oy vermek için giriş yap"}
      </p>
    </section>
  );
}