"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "../lib/supabase";
import { Avatar, hataCevir, useEngelliler } from "./PostCard";

type Kisi = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  equipped_frame: string | null;
};

type Satir = { profiles: Kisi | null };

const KOLONLAR = "id, username, display_name, avatar_url, equipped_frame";

export default function BaglantiListesi({
  baslangic,
}: {
  baslangic: "takipciler" | "takip";
}) {
  const supabase = createClient();
  const params = useParams<{ kullanici: string }>();
  const kullaniciAdi = decodeURIComponent(params.kullanici);

  const [sekme, setSekme] = useState<"takipciler" | "takip">(baslangic);
  const [takipciler, setTakipciler] = useState<Kisi[]>([]);
  const [takipEdilenler, setTakipEdilenler] = useState<Kisi[]>([]);
  const [benimId, setBenimId] = useState<string | null>(null);
  const [benimTakiplerim, setBenimTakiplerim] = useState<Set<string>>(new Set());
  const [yukleniyor, setYukleniyor] = useState(true);
  const [bulunamadi, setBulunamadi] = useState(false);
  const [hata, setHata] = useState("");
  const gizli = useEngelliler(benimId);

  async function benimTakipleriniGetir(uid: string) {
    const { data } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", uid);
    setBenimTakiplerim(new Set((data || []).map((x) => x.following_id)));
  }

  useEffect(() => {
    async function baslat() {
      const { data: k } = await supabase.auth.getUser();
      const uid = k.user?.id ?? null;
      setBenimId(uid);

      const { data: p } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", kullaniciAdi)
        .maybeSingle();
      if (!p) {
        setBulunamadi(true);
        setYukleniyor(false);
        return;
      }

      const [a, b] = await Promise.all([
        supabase
          .from("user_follows")
          .select(`profiles!user_follows_follower_id_fkey(${KOLONLAR})`)
          .eq("following_id", p.id)
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("user_follows")
          .select(`profiles!user_follows_following_id_fkey(${KOLONLAR})`)
          .eq("follower_id", p.id)
          .order("created_at", { ascending: false })
          .limit(300),
      ]);
      if (a.error) setHata(a.error.message);
      if (b.error) setHata(b.error.message);

      const cikar = (v: unknown) =>
        ((v as Satir[]) || [])
          .map((x) => x.profiles)
          .filter((x): x is Kisi => !!x);
      setTakipciler(cikar(a.data));
      setTakipEdilenler(cikar(b.data));

      if (uid) await benimTakipleriniGetir(uid);
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kullaniciAdi]);

  async function takipDegistir(kisi: Kisi) {
    if (!benimId) {
      setHata("Takip etmek için giriş yapmalısın.");
      return;
    }
    setHata("");
    const takipte = benimTakiplerim.has(kisi.id);
    const { error } = takipte
      ? await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", benimId)
          .eq("following_id", kisi.id)
      : await supabase
          .from("user_follows")
          .insert({ follower_id: benimId, following_id: kisi.id });
    if (error) setHata(hataCevir(error.message));
    else await benimTakipleriniGetir(benimId);
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-3xl border border-line bg-card"
          />
        ))}
      </main>
    );
  }

  if (bulunamadi) {
    return (
      <main className="mx-auto max-w-2xl p-10 text-center text-muted">
        Kullanıcı bulunamadı.
      </main>
    );
  }

  const liste = (sekme === "takipciler" ? takipciler : takipEdilenler).filter(
    (k) => !gizli.has(k.id)
  );

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <Link
        href={`/profil/${kullaniciAdi}`}
        className="text-sm text-muted hover:text-ink"
      >
        ← @{kullaniciAdi}
      </Link>

      <div className="flex gap-2">
        {(
          [
            ["takipciler", `Takipçiler ${takipciler.length}`],
            ["takip", `Takip edilenler ${takipEdilenler.length}`],
          ] as const
        ).map(([anahtar, etiket]) => (
          <button
            key={anahtar}
            onClick={() => setSekme(anahtar)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              sekme === anahtar
                ? "btn-brand"
                : "bg-card2 text-muted hover:text-ink"
            }`}
          >
            {etiket}
          </button>
        ))}
      </div>

      {hata && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}

      {liste.length === 0 && (
        <div className="rounded-3xl border border-dashed border-line py-10 text-center text-muted">
          <p className="text-4xl">👥</p>
          <p className="mt-2">
            {sekme === "takipciler"
              ? "Henüz takipçi yok."
              : "Henüz kimse takip edilmiyor."}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {liste.map((k) => (
          <div
            key={k.id}
            className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3"
          >
            <Avatar
              url={k.avatar_url}
              ad={k.username}
              boyut="h-11 w-11"
              cerceve={k.equipped_frame}
            />
            <Link
              href={`/profil/${k.username}`}
              className="min-w-0 flex-1 hover:text-brand"
            >
              <p className="truncate font-semibold">
                {k.display_name || k.username}
              </p>
              <p className="truncate text-xs text-muted">@{k.username}</p>
            </Link>
            {benimId && benimId !== k.id && (
              <button
                onClick={() => takipDegistir(k)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  benimTakiplerim.has(k.id)
                    ? "bg-card2 text-muted hover:text-ink"
                    : "btn-brand"
                }`}
              >
                {benimTakiplerim.has(k.id) ? "Takipte" : "Takip et"}
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}