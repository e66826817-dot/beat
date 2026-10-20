"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import {
  Avatar,
  MetinGoster,
  fotolariYukle,
  hataCevir,
  useEngelliler,
  zamanOnce,
} from "../../../components/PostCard";
import SikayetFormu from "../../../components/SikayetFormu";

type Kanal = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    equipped_frame: string | null;
  } | null;
};

type Gonderi = {
  id: string;
  author_id: string;
  body: string | null;
  image_url: string | null;
  created_at: string;
  channel_post_likes: { user_id: string }[];
};

export default function KanalSayfasi() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [kanal, setKanal] = useState<Kanal | null>(null);
  const [gonderiler, setGonderiler] = useState<Gonderi[]>([]);
  const [takipciler, setTakipciler] = useState<string[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [bulunamadi, setBulunamadi] = useState(false);
  const [hata, setHata] = useState("");
  const [metin, setMetin] = useState("");
  const [dosya, setDosya] = useState<File | null>(null);
  const [islem, setIslem] = useState(false);
  const [rapor, setRapor] = useState<string | null>(null);
  const gizli = useEngelliler(uid);

  async function gonderileriGetir(kanalId: string) {
    const { data, error } = await supabase
      .from("channel_posts")
      .select(
        "id, author_id, body, image_url, created_at, channel_post_likes(user_id)"
      )
      .eq("channel_id", kanalId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) setHata(error.message);
    else
      setGonderiler(
        ((data as unknown as Gonderi[]) || []).map((g) => ({
          ...g,
          channel_post_likes: g.channel_post_likes ?? [],
        }))
      );
  }

  async function takipciGetir(kanalId: string) {
    const { data } = await supabase
      .from("channel_follows")
      .select("user_id")
      .eq("channel_id", kanalId);
    setTakipciler((data || []).map((x) => x.user_id));
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
        setAdmin(p?.role === "admin");
      }
      const { data } = await supabase
        .from("channels")
        .select(
          "id, name, description, owner_id, profiles!channels_owner_id_fkey(username, avatar_url, equipped_frame)"
        )
        .eq("slug", slug)
        .maybeSingle();
      if (!data) {
        setBulunamadi(true);
      } else {
        const c = data as unknown as Kanal;
        setKanal(c);
        await gonderileriGetir(c.id);
        await takipciGetir(c.id);
      }
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function takipDegistir() {
    if (!kanal) return;
    if (!uid) {
      setHata("Takip etmek için giriş yapmalısın.");
      return;
    }
    setHata("");
    const takipte = takipciler.includes(uid);
    const { error } = takipte
      ? await supabase
          .from("channel_follows")
          .delete()
          .eq("channel_id", kanal.id)
          .eq("user_id", uid)
      : await supabase
          .from("channel_follows")
          .insert({ channel_id: kanal.id, user_id: uid });
    if (error) setHata(hataCevir(error.message));
    else await takipciGetir(kanal.id);
  }

  async function paylas(e: React.FormEvent) {
    e.preventDefault();
    if (!kanal || !uid || islem || (!metin.trim() && !dosya)) return;
    setHata("");
    setIslem(true);
    let resim: string | null = null;
    if (dosya) {
      const yukleme = await fotolariYukle(supabase, uid, [dosya]);
      if (yukleme.hata) {
        setHata(yukleme.hata);
        setIslem(false);
        return;
      }
      resim = yukleme.urls[0] ?? null;
    }
    const { error } = await supabase.from("channel_posts").insert({
      channel_id: kanal.id,
      author_id: uid,
      body: metin.trim() || null,
      image_url: resim,
    });
    if (error) setHata(hataCevir(error.message));
    else {
      setMetin("");
      setDosya(null);
      await gonderileriGetir(kanal.id);
    }
    setIslem(false);
  }

  async function begen(g: Gonderi) {
    if (!uid || !kanal) {
      setHata("Beğenmek için giriş yapmalısın.");
      return;
    }
    setHata("");
    const begendi = g.channel_post_likes.some((l) => l.user_id === uid);
    const { error } = begendi
      ? await supabase
          .from("channel_post_likes")
          .delete()
          .eq("user_id", uid)
          .eq("post_id", g.id)
      : await supabase
          .from("channel_post_likes")
          .insert({ user_id: uid, post_id: g.id });
    if (error) setHata(hataCevir(error.message));
    else await gonderileriGetir(kanal.id);
  }

  async function gonderiSil(g: Gonderi) {
    if (!kanal || !window.confirm("Bu gönderi silinsin mi?")) return;
    setHata("");
    const { data, error } = await supabase
      .from("channel_posts")
      .delete()
      .eq("id", g.id)
      .select("id");
    if (error || !data || data.length === 0) {
      setHata(hataCevir(error?.message ?? "Gönderi silinemedi."));
      return;
    }
    await gonderileriGetir(kanal.id);
  }

  async function kanalSil() {
    if (!kanal) return;
    if (!window.confirm("Kanal ve tüm gönderileri silinsin mi?")) return;
    const { error } = await supabase.from("channels").delete().eq("id", kanal.id);
    if (error) {
      setHata(hataCevir(error.message));
      return;
    }
    router.push("/kanallar");
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 p-4">
        <div className="h-32 animate-pulse rounded-3xl border border-line bg-card" />
      </main>
    );
  }

  if (bulunamadi || !kanal) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <p className="text-4xl">📰</p>
        <p className="text-muted">Kanal bulunamadı.</p>
        <Link href="/kanallar" className="text-brand hover:underline">
          Tüm kanallar
        </Link>
      </main>
    );
  }

  const sahip = uid === kanal.owner_id;
  const takipte = !!uid && takipciler.includes(uid);
  const liste = gonderiler.filter((g) => !gizli.has(g.author_id));
  const sahipAd = kanal.profiles?.username ?? "bilinmiyor";

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <Link href="/kanallar" className="text-sm text-muted hover:text-ink">
        ← Tüm kanallar
      </Link>

      <section className="space-y-3 rounded-3xl border border-line bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="btn-brand flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-extrabold">
            {kanal.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold">{kanal.name}</h2>
            <p className="text-xs">
              <span className="font-semibold text-brand">✓ Magazin</span>
              <span className="text-muted">
                {" "}
                ·{" "}
                <Link href={`/profil/${sahipAd}`} className="hover:text-brand">
                  @{sahipAd}
                </Link>{" "}
                · {takipciler.length} takipçi
              </span>
            </p>
          </div>
          {!sahip && (
            <button
              onClick={takipDegistir}
              className={`shrink-0 rounded-full px-5 py-2 text-sm font-semibold ${
                takipte ? "bg-card2 text-muted hover:text-ink" : "btn-brand"
              }`}
            >
              {takipte ? "Takipte" : "Takip et"}
            </button>
          )}
        </div>
        {kanal.description && (
          <p className="text-sm text-muted">{kanal.description}</p>
        )}
        {(sahip || admin) && (
          <button
            onClick={kanalSil}
            className="text-xs font-semibold text-red-400 hover:text-red-300"
          >
            Kanalı sil
          </button>
        )}
      </section>

      {sahip && (
        <form
          onSubmit={paylas}
          className="space-y-3 rounded-3xl border border-line bg-card p-4"
        >
          <textarea
            value={metin}
            onChange={(e) => setMetin(e.target.value)}
            placeholder="Kanalına bir haber ya da duyuru paylaş..."
            maxLength={1000}
            rows={4}
            className="w-full resize-none rounded-2xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="cursor-pointer rounded-xl bg-card2 px-3 py-2.5 text-sm text-muted hover:text-ink">
              📷 {dosya ? dosya.name.slice(0, 20) : "Fotoğraf (isteğe bağlı)"}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setDosya(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
            <button
              type="submit"
              disabled={islem || (!metin.trim() && !dosya)}
              className="btn-brand rounded-xl px-6 py-2.5 text-sm font-semibold"
            >
              {islem ? "Paylaşılıyor..." : "Paylaş"}
            </button>
          </div>
        </form>
      )}

      {hata && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}

      {liste.length === 0 && (
        <div className="rounded-3xl border border-dashed border-line py-12 text-center text-muted">
          <p className="text-4xl">📰</p>
          <p className="mt-2">Bu kanalda henüz paylaşım yok.</p>
        </div>
      )}

      <div className="space-y-3">
        {liste.map((g) => {
          const begendi = g.channel_post_likes.some((l) => l.user_id === uid);
          return (
            <article
              key={g.id}
              className="rounded-3xl border border-line bg-card p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  url={kanal.profiles?.avatar_url}
                  ad={sahipAd}
                  cerceve={kanal.profiles?.equipped_frame}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{kanal.name}</p>
                  <p className="text-xs text-muted">{zamanOnce(g.created_at)}</p>
                </div>
              </div>

              {g.body && (
                <p className="mt-3 whitespace-pre-wrap">
                  <MetinGoster metin={g.body} />
                </p>
              )}
              {g.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={g.image_url}
                  alt="Kanal gönderisi"
                  className="mt-3 max-h-[28rem] w-full rounded-2xl object-cover"
                />
              )}

              <div className="mt-3 flex items-center gap-1 border-t border-line pt-3 text-sm">
                <button
                  onClick={() => begen(g)}
                  className={`rounded-xl px-3 py-2 transition hover:bg-card2 ${
                    begendi ? "font-semibold text-brand" : "text-muted"
                  }`}
                >
                  {begendi ? "♥" : "♡"} {g.channel_post_likes.length}
                </button>
                {uid && g.author_id !== uid && (
                  <button
                    onClick={() => setRapor(rapor === g.id ? null : g.id)}
                    className="rounded-xl px-3 py-2 text-muted hover:bg-card2"
                    aria-label="Şikayet et"
                  >
                    ⚑
                  </button>
                )}
                {(admin || g.author_id === uid) && (
                  <button
                    onClick={() => gonderiSil(g)}
                    className="ml-auto rounded-xl px-3 py-2 text-red-400 hover:bg-card2"
                  >
                    Sil
                  </button>
                )}
              </div>

              {rapor === g.id && uid && (
                <SikayetFormu
                  hedefTuru="channel_post"
                  hedefId={g.id}
                  kullaniciId={uid}
                  onKapat={() => setRapor(null)}
                />
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}