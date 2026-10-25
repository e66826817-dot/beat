"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase";

type Veri = {
  seri: number;
  puan: number;
  bildirim: number;
  oyVerdi: boolean;
  soruVar: boolean;
};

export default function GunlukKanca({
  kullaniciId,
}: {
  kullaniciId: string | null;
}) {
  const supabase = createClient();
  const [v, setV] = useState<Veri | null>(null);

  useEffect(() => {
    if (!kullaniciId) return;
    async function getir() {
      const [oz, bil, oy, soru] = await Promise.all([
        supabase.rpc("gorev_ozet"),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", kullaniciId as string)
          .eq("is_read", false),
        supabase.rpc("artist_benim_oyum"),
        supabase
          .from("daily_questions")
          .select("id")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle(),
      ]);
      const satir = ((oz.data as { puan: number; seri: number }[]) || [])[0];
      setV({
        seri: satir?.seri ?? 0,
        puan: satir?.puan ?? 0,
        bildirim: bil.count ?? 0,
        oyVerdi: ((oy.data as unknown[]) || []).length > 0,
        soruVar: !!soru.data,
      });
    }
    getir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kullaniciId]);

  if (!kullaniciId || !v) return null;

  const bonusaKalan = 7 - (v.seri % 7 || 7) + (v.seri % 7 === 0 ? 7 : 0);
  const satirlar: { ikon: string; metin: string; link: string }[] = [];

  if (v.bildirim > 0) {
    satirlar.push({
      ikon: "🔔",
      metin: `${v.bildirim} okunmamış bildirimin var`,
      link: "/bildirimler",
    });
  }
  if (v.soruVar) {
    satirlar.push({
      ikon: "💭",
      metin: "Günün sorusunu cevapla",
      link: "/soru",
    });
  }
  if (!v.oyVerdi) {
    satirlar.push({
      ikon: "⭐",
      metin: "Bugünün artistine oy ver",
      link: "/artist",
    });
  }
  satirlar.push({
    ikon: "🎯",
    metin: "Günlük görevlerine bak",
    link: "/gorevler",
  });

  return (
    <section className="space-y-3 rounded-3xl border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-extrabold">🔥 {v.seri} günlük seri</p>
          <p className="text-xs text-muted">
            {bonusaKalan === 0 || bonusaKalan === 7
              ? "Yarın da gel, seri devam etsin!"
              : `${bonusaKalan} gün sonra +10 bonus puan`}
          </p>
        </div>
        <Link
          href="/liderlik"
          className="rounded-full bg-card2 px-3 py-1.5 text-sm font-bold text-brand"
        >
          {v.puan} puan →
        </Link>
      </div>

      <div className="space-y-1.5">
        {satirlar.map((s) => (
          <Link
            key={s.link}
            href={s.link}
            className="flex items-center gap-3 rounded-2xl bg-card2 px-3 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
          >
            <span>{s.ikon}</span>
            {s.metin}
            <span className="ml-auto text-muted">→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}