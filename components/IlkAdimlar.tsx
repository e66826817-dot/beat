"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase";

type Madde = { id: string; etiket: string; link: string; tamam: boolean };

export default function IlkAdimlar({
  kullaniciId,
  kullaniciAdi,
}: {
  kullaniciId: string | null;
  kullaniciAdi?: string;
}) {
  const supabase = createClient();
  const [maddeler, setMaddeler] = useState<Madde[] | null>(null);
  const [gizli, setGizli] = useState(false);

  useEffect(() => {
    if (!kullaniciId) return;
    try {
      if (localStorage.getItem(`beat-ilkadim-${kullaniciId}`) === "1") {
        setGizli(true);
        return;
      }
    } catch {}
    async function getir() {
      const say = async (tablo: string, kolon: string) => {
        const { count } = await supabase
          .from(tablo)
          .select("*", { count: "exact", head: true })
          .eq(kolon, kullaniciId as string);
        return (count ?? 0) > 0;
      };
      const [takip, gonderi, oy, tepki, profil] = await Promise.all([
        say("group_follows", "user_id"),
        say("posts", "user_id"),
        say("poll_votes", "user_id"),
        say("likes", "user_id"),
        supabase
          .from("profiles")
          .select("bio, bias")
          .eq("id", kullaniciId as string)
          .maybeSingle()
          .then(({ data }) => !!(data?.bio || data?.bias)),
      ]);
      setMaddeler([
        { id: "takip", etiket: "Bir grubu takip et", link: "/gruplar", tamam: takip },
        { id: "gonderi", etiket: "İlk gönderini paylaş", link: "/", tamam: gonderi },
        { id: "tepki", etiket: "Bir gönderiye tepki ver", link: "/", tamam: tepki },
        { id: "oy", etiket: "Bir ankete oy ver", link: "/anketler", tamam: oy },
        {
          id: "profil",
          etiket: "Profilini doldur (bio ya da bias)",
          link: kullaniciAdi ? `/profil/${kullaniciAdi}` : "/",
          tamam: profil,
        },
      ]);
    }
    getir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kullaniciId, kullaniciAdi]);

  if (!kullaniciId || gizli || !maddeler) return null;
  const biten = maddeler.filter((m) => m.tamam).length;
  if (biten === maddeler.length) return null;

  function kapat() {
    try {
      localStorage.setItem(`beat-ilkadim-${kullaniciId}`, "1");
    } catch {}
    setGizli(true);
  }

  return (
    <section className="space-y-3 rounded-3xl border border-brand bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-extrabold">🚀 İlk adımlar</h3>
          <p className="text-xs text-muted">
            {biten}/{maddeler.length} tamamlandı. Beat&apos;i keşfetmeye başla!
          </p>
        </div>
        <button
          onClick={kapat}
          className="text-xs text-muted hover:text-ink"
          aria-label="Gizle"
        >
          Gizle ✕
        </button>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-card2">
        <div
          className="btn-brand h-full rounded-full transition-all"
          style={{ width: `${(biten / maddeler.length) * 100}%` }}
        />
      </div>

      <div className="space-y-1.5">
        {maddeler.map((m) => (
          <Link
            key={m.id}
            href={m.link}
            className={`flex items-center gap-3 rounded-2xl bg-card2 px-3 py-2.5 text-sm transition hover:-translate-y-0.5 ${
              m.tamam ? "opacity-60" : ""
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                m.tamam ? "btn-brand" : "border border-line"
              }`}
            >
              {m.tamam ? "✓" : ""}
            </span>
            <span className={m.tamam ? "line-through" : "font-semibold"}>
              {m.etiket}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}