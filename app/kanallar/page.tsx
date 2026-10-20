"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { hataCevir } from "../../components/PostCard";

type Kanal = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  owner_id: string;
  profiles: { username: string } | null;
  channel_follows: { user_id: string }[];
};

function slugla(m: string) {
  return m
    .trim()
    .replace(/İ/g, "i")
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export default function KanallarSayfasi() {
  const supabase = createClient();
  const [kanallar, setKanallar] = useState<Kanal[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [acabilir, setAcabilir] = useState(false);
  const [sekme, setSekme] = useState<"hepsi" | "takip">("hepsi");
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");
  const [formAcik, setFormAcik] = useState(false);
  const [ad, setAd] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [islem, setIslem] = useState(false);

  async function getir() {
    const { data, error } = await supabase
      .from("channels")
      .select(
        "id, slug, name, description, owner_id, profiles!channels_owner_id_fkey(username), channel_follows(user_id)"
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) setHata(error.message);
    else
      setKanallar(
        ((data as unknown as Kanal[]) || []).map((k) => ({
          ...k,
          channel_follows: k.channel_follows ?? [],
        }))
      );
  }

  useEffect(() => {
    async function baslat() {
      const { data: k } = await supabase.auth.getUser();
      setUid(k.user?.id ?? null);
      if (k.user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", k.user.id)
          .single();
        setAcabilir(p?.role === "magazine" || p?.role === "admin");
      }
      await getir();
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function olustur(e: React.FormEvent) {
    e.preventDefault();
    if (!uid || islem) return;
    const slug = slugla(ad);
    if (ad.trim().length < 3 || slug.length < 3) {
      setHata("Kanal adı en az 3 karakter olmalı.");
      return;
    }
    setHata("");
    setIslem(true);
    const { error } = await supabase.from("channels").insert({
      owner_id: uid,
      name: ad.trim(),
      slug,
      description: aciklama.trim() || null,
    });
    if (error) {
      setHata(
        error.code === "23505"
          ? "Bu isimde bir kanal zaten var."
          : hataCevir(error.message)
      );
    } else {
      setAd("");
      setAciklama("");
      setFormAcik(false);
      await getir();
    }
    setIslem(false);
  }

  async function takipDegistir(k: Kanal) {
    if (!uid) {
      setHata("Takip etmek için giriş yapmalısın.");
      return;
    }
    setHata("");
    const takipte = k.channel_follows.some((f) => f.user_id === uid);
    const { error } = takipte
      ? await supabase
          .from("channel_follows")
          .delete()
          .eq("channel_id", k.id)
          .eq("user_id", uid)
      : await supabase
          .from("channel_follows")
          .insert({ channel_id: k.id, user_id: uid });
    if (error) setHata(hataCevir(error.message));
    else await getir();
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 p-4">
        <div className="h-28 animate-pulse rounded-3xl border border-line bg-card" />
        <div className="h-28 animate-pulse rounded-3xl border border-line bg-card" />
      </main>
    );
  }

  const liste =
    sekme === "takip"
      ? kanallar.filter((k) => k.channel_follows.some((f) => f.user_id === uid))
      : kanallar;
  const alan =
    "w-full rounded-2xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand";

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold">📰 Kanallar</h2>
          <p className="text-sm text-muted">
            Magazin sayfalarının haber ve duyuru kanalları.
          </p>
        </div>
        {acabilir && (
          <button
            onClick={() => setFormAcik(!formAcik)}
            className="btn-brand shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            {formAcik ? "Vazgeç" : "+ Kanal aç"}
          </button>
        )}
      </div>

      {formAcik && (
        <form
          onSubmit={olustur}
          className="space-y-3 rounded-3xl border border-line bg-card p-4"
        >
          <input
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            placeholder="Kanal adı"
            maxLength={40}
            required
            className={alan}
          />
          {ad.trim() && (
            <p className="text-xs text-muted">Adres: /kanallar/{slugla(ad)}</p>
          )}
          <textarea
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            placeholder="Kanal açıklaması (isteğe bağlı)"
            maxLength={200}
            rows={3}
            className={`${alan} resize-none`}
          />
          <p className="text-xs text-muted">
            En fazla 3 kanal açabilirsin. Kanalda yalnızca sen paylaşım
            yaparsın.
          </p>
          <button
            type="submit"
            disabled={islem}
            className="btn-brand w-full rounded-xl p-3 font-semibold"
          >
            {islem ? "Açılıyor..." : "Kanalı aç"}
          </button>
        </form>
      )}

      {hata && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}

      <div className="flex gap-2">
        {(
          [
            ["hepsi", "Tüm kanallar"],
            ["takip", "Takip ettiklerim"],
          ] as const
        ).map(([a, e]) => (
          <button
            key={a}
            onClick={() => setSekme(a)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              sekme === a ? "btn-brand" : "bg-card2 text-muted hover:text-ink"
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      {liste.length === 0 && !hata && (
        <div className="rounded-3xl border border-dashed border-line py-12 text-center text-muted">
          <p className="text-4xl">📰</p>
          <p className="mt-2 px-4">
            {sekme === "takip"
              ? "Henüz bir kanalı takip etmiyorsun."
              : "Henüz kanal yok."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {liste.map((k) => {
          const takipte = k.channel_follows.some((f) => f.user_id === uid);
          return (
            <div
              key={k.id}
              className="flex items-center gap-3 rounded-3xl border border-line bg-card p-4"
            >
              <div className="btn-brand flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold">
                {k.name.charAt(0).toUpperCase()}
              </div>
              <Link href={`/kanallar/${k.slug}`} className="min-w-0 flex-1">
                <p className="truncate font-bold hover:text-brand">
                  {k.name} <span className="text-xs text-brand">✓ Magazin</span>
                </p>
                <p className="truncate text-xs text-muted">
                  @{k.profiles?.username ?? "?"} · {k.channel_follows.length}{" "}
                  takipçi
                </p>
                {k.description && (
                  <p className="line-clamp-1 text-xs text-muted">
                    {k.description}
                  </p>
                )}
              </Link>
              <button
                onClick={() => takipDegistir(k)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                  takipte ? "bg-card2 text-muted hover:text-ink" : "btn-brand"
                }`}
              >
                {takipte ? "Takipte" : "Takip et"}
              </button>
            </div>
          );
        })}
      </div>
    </main>
  );
}