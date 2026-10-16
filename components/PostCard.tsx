"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase";
import { cerceveBul } from "../lib/kozmetik";
import SikayetFormu from "./SikayetFormu";

export type Yazar = {
  username: string;
  avatar_url: string | null;
  equipped_frame: string | null;
  title: { name: string } | null;
};

export type Yorum = {
  id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  pinned_at: string | null;
  profiles: Yazar | null;
  comment_likes: { user_id: string }[];
};

export type Orijinal = {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  created_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
};

export type Gonderi = {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  image_urls: string[];
  group_id: string | null;
  category: string;
  repost_of: string | null;
  created_at: string;
  edited_at: string | null;
  pinned_at: string | null;
  profile_pinned_at: string | null;
  profiles: Yazar | null;
  groups: { name: string; slug: string } | null;
  likes: { user_id: string; emoji: string }[];
  comments: Yorum[];
  bookmarks: { user_id: string }[];
  original: Orijinal | null;
  reposts: {
    id: string;
    user_id: string;
    content: string | null;
    image_url: string | null;
    image_urls: string[] | null;
  }[];
};

export const KATEGORILER = [
  { id: "genel", etiket: "Genel", ikon: "💬" },
  { id: "fanart", etiket: "Fan art", ikon: "🎨" },
  { id: "konser", etiket: "Konser", ikon: "🎟️" },
  { id: "soru", etiket: "Soru", ikon: "❓" },
  { id: "haber", etiket: "Haber", ikon: "📰" },
] as const;

export const TEPKILER = ["🔥", "😭", "💖", "😍", "👏"] as const;

export const MAKS_FOTO = 4;

export const GONDERI_SORGUSU =
  "id, user_id, content, image_url, image_urls, group_id, category, repost_of, created_at, edited_at, pinned_at, profile_pinned_at, profiles!posts_user_id_fkey(username, avatar_url, equipped_frame, title:equipped_title_id(name)), groups!posts_group_id_fkey(name, slug), likes(user_id, emoji), comments(id, user_id, parent_id, content, created_at, pinned_at, profiles!comments_user_id_fkey(username, avatar_url, equipped_frame, title:equipped_title_id(name)), comment_likes(user_id)), bookmarks(user_id), original:repost_of(id, user_id, content, image_url, image_urls, created_at, profiles!posts_user_id_fkey(username, avatar_url)), reposts:posts!repost_of(id, user_id, content, image_url, image_urls)";

export function gonderiDuzenle(g: Gonderi): Gonderi {
  return {
    ...g,
    image_urls: g.image_urls ?? [],
    likes: g.likes ?? [],
    bookmarks: g.bookmarks ?? [],
    reposts: g.reposts ?? [],
    original: g.original ?? null,
    comments: (g.comments ?? [])
      .map((y) => ({ ...y, comment_likes: y.comment_likes ?? [] }))
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
  };
}

// Ham veritabanı hatalarını anlaşılır hâle getirir
export function hataCevir(m: string) {
  if (m.includes("row-level security")) {
    return "Bu işlemi şu an yapamazsın (hesabın kısıtlı olabilir ya da bu kişiyle aranda engel var).";
  }
  return m;
}

export function zamanOnce(tarih: string) {
  const sn = Math.floor((Date.now() - new Date(tarih).getTime()) / 1000);
  if (sn < 60) return "şimdi";
  const dk = Math.floor(sn / 60);
  if (dk < 60) return `${dk} dk önce`;
  const sa = Math.floor(dk / 60);
  if (sa < 24) return `${sa} sa önce`;
  const gun = Math.floor(sa / 24);
  if (gun < 7) return `${gun} gün önce`;
  return new Date(tarih).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
  });
}

// İçeriği olmayan, sadece "yeniden paylaşım" olan gönderi mi?
export function safMi(p: {
  content: string | null;
  image_url: string | null;
  image_urls: string[] | null;
}) {
  return !p.content && !p.image_url && (p.image_urls ?? []).length === 0;
}

// ---- Gizlenen kişiler: engellenenler + sessize alınanlar (ortak önbellek) ----
let engelSozu: { uid: string; sozu: Promise<Set<string>> } | null = null;
const engelDinleyicileri = new Set<() => void>();

export function engelOnbellekSifirla() {
  engelSozu = null;
  engelDinleyicileri.forEach((f) => f());
}

function engelleriGetir(
  supabase: ReturnType<typeof createClient>,
  uid: string
): Promise<Set<string>> {
  if (!engelSozu || engelSozu.uid !== uid) {
    engelSozu = {
      uid,
      sozu: (async () => {
        const [b, m] = await Promise.all([
          supabase.from("blocks").select("blocked_id").eq("blocker_id", uid),
          supabase.from("mutes").select("muted_id").eq("muter_id", uid),
        ]);
        return new Set<string>([
          ...(b.data || []).map((x) => x.blocked_id),
          ...(m.data || []).map((x) => x.muted_id),
        ]);
      })(),
    };
  }
  return engelSozu.sozu;
}

export function useEngelliler(kullaniciId: string | null) {
  const supabase = createClient();
  const [liste, setListe] = useState<Set<string>>(new Set());

  useEffect(() => {
    let iptal = false;
    async function yukle() {
      if (!kullaniciId) {
        if (!iptal) setListe(new Set());
        return;
      }
      const s = await engelleriGetir(supabase, kullaniciId);
      if (!iptal) setListe(new Set(s));
    }
    yukle();
    engelDinleyicileri.add(yukle);
    return () => {
      iptal = true;
      engelDinleyicileri.delete(yukle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kullaniciId]);

  return liste;
}

// Seçilen dosyaları Supabase'e yükler, herkese açık adreslerini döndürür
export async function fotolariYukle(
  supabase: ReturnType<typeof createClient>,
  kullaniciId: string,
  dosyalar: File[]
): Promise<{ urls: string[]; hata?: string }> {
  const urls: string[] = [];
  for (let i = 0; i < dosyalar.length; i++) {
    const dosya = dosyalar[i];
    if (dosya.size > 5 * 1024 * 1024) {
      return { urls, hata: `"${dosya.name}" 5 MB'dan büyük.` };
    }
    const uzanti = dosya.name.split(".").pop()?.toLowerCase() || "jpg";
    const yol = `${kullaniciId}/${Date.now()}-${i}.${uzanti}`;
    const { error } = await supabase.storage
      .from("post-images")
      .upload(yol, dosya);
    if (error) return { urls, hata: hataCevir(error.message) };
    urls.push(
      supabase.storage.from("post-images").getPublicUrl(yol).data.publicUrl
    );
  }
  return { urls };
}

export function Avatar({
  url,
  ad,
  boyut = "h-10 w-10",
  cerceve,
}: {
  url?: string | null;
  ad: string;
  boyut?: string;
  cerceve?: string | null;
}) {
  const ic = url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={ad}
      className={`${boyut} shrink-0 rounded-full object-cover`}
    />
  ) : (
    <div
      className={`btn-brand flex ${boyut} shrink-0 items-center justify-center rounded-full text-base font-bold`}
    >
      {ad.charAt(0).toUpperCase()}
    </div>
  );

  const c = cerceveBul(cerceve);
  if (!c) return ic;
  return (
    <span
      className="inline-flex shrink-0 rounded-full p-[3px]"
      style={{ background: c.arka, boxShadow: c.golge }}
    >
      {ic}
    </span>
  );
}

// Kullanıcı adının yanında görünen ünvan etiketi
export function UnvanRozeti({ ad }: { ad: string }) {
  return (
    <span className="ml-1.5 rounded-full bg-card2 px-2 py-0.5 text-[11px] font-semibold text-brand">
      ✦ {ad}
    </span>
  );
}

// Metindeki #etiket ve @kullanici kısımlarını tıklanabilir yapar
export function MetinGoster({ metin }: { metin: string }) {
  const parcalar = metin.split(/(#[\p{L}\p{N}_]+|@[A-Za-z0-9_]{3,20})/gu);
  return (
    <>
      {parcalar.map((p, i) => {
        if (p.startsWith("#") && p.length > 1) {
          return (
            <Link
              key={i}
              href={`/etiket/${encodeURIComponent(p.slice(1).toLowerCase())}`}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-brand hover:underline"
            >
              {p}
            </Link>
          );
        }
        if (p.startsWith("@") && p.length > 1) {
          return (
            <Link
              key={i}
              href={`/profil/${p.slice(1)}`}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-brand hover:underline"
            >
              {p}
            </Link>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

// Alıntı ve yeniden paylaşımda gösterilen orijinal gönderi kutusu
function OrijinalKutu({ o }: { o: Orijinal }) {
  const ad = o.profiles?.username ?? "bilinmiyor";
  const foto = o.image_url ?? (o.image_urls ?? [])[0] ?? null;
  return (
    <Link
      href={`/gonderi/${o.id}`}
      className="mt-3 block rounded-2xl border border-line bg-card2 p-3 transition hover:border-brand"
    >
      <div className="flex items-center gap-2">
        <Avatar url={o.profiles?.avatar_url} ad={ad} boyut="h-6 w-6" />
        <span className="text-sm font-semibold">@{ad}</span>
        <span className="text-xs text-muted">{zamanOnce(o.created_at)}</span>
      </div>
      {o.content && (
        <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm">
          <MetinGoster metin={o.content} />
        </p>
      )}
      {foto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={foto}
          alt="Orijinal gönderi fotoğrafı"
          className="mt-2 h-48 w-full rounded-xl object-cover"
        />
      )}
    </Link>
  );
}

function EngelliKutu() {
  return (
    <p className="mt-3 rounded-2xl border border-dashed border-line p-3 text-sm text-muted">
      🚫 Gizlediğin bir kullanıcının gönderisi gizlendi.
    </p>
  );
}

type Props = {
  gonderi: Gonderi;
  kullaniciId: string | null;
  admin?: boolean;
  detay?: boolean;
  profilde?: boolean;
  onYenile: () => void | Promise<void>;
  onSilindi?: () => void;
};

type CevapHedefi = { parentId: string; ad: string; onek: boolean };

export default function PostCard({
  gonderi: g,
  kullaniciId,
  admin = false,
  detay = false,
  profilde = false,
  onYenile,
  onSilindi,
}: Props) {
  const supabase = createClient();
  const engelli = useEngelliler(kullaniciId);
  const [acik, setAcik] = useState(detay);
  const [yorumMetni, setYorumMetni] = useState("");
  const [cevapHedefi, setCevapHedefi] = useState<CevapHedefi | null>(null);
  const [hata, setHata] = useState("");
  const [kopyalandi, setKopyalandi] = useState(false);
  const [buyukSira, setBuyukSira] = useState<number | null>(null);
  const [tepkiAcik, setTepkiAcik] = useState(false);
  const [paylasMenuAcik, setPaylasMenuAcik] = useState(false);
  const [menuAcik, setMenuAcik] = useState(false);
  const [alintiAcik, setAlintiAcik] = useState(false);
  const [alintiMetni, setAlintiMetni] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [gonderiRaporAcik, setGonderiRaporAcik] = useState(false);
  const [raporYorumId, setRaporYorumId] = useState<string | null>(null);
  const [duzenleAcik, setDuzenleAcik] = useState(false);
  const [duzenleMetni, setDuzenleMetni] = useState("");
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const yorumKutusuRef = useRef<HTMLInputElement>(null);

  // Eski tek fotoğraf + yeni fotoğraflar tek listede
  const fotolar = [...(g.image_url ? [g.image_url] : []), ...g.image_urls];

  // Gizlenen kişilerin yorumlarını gizle
  const yorumlar = g.comments.filter((y) => !engelli.has(y.user_id));

  const yazar = g.profiles?.username ?? "bilinmiyor";
  const benimTepkim = g.likes.find((l) => l.user_id === kullaniciId)?.emoji;
  const kaydetti = g.bookmarks.some((b) => b.user_id === kullaniciId);
  const kategori = KATEGORILER.find((k) => k.id === g.category);
  const silebilir = admin || g.user_id === kullaniciId;
  const safYenidenPaylasim = !!g.repost_of && safMi(g);
  const benimYenidenPaylasimim = g.reposts.find(
    (r) => r.user_id === kullaniciId && safMi(r)
  );
  const sikayetEdebilir = !!kullaniciId && g.user_id !== kullaniciId;
  const duzenleyebilir = !!kullaniciId && g.user_id === kullaniciId;
  const orijinalEngelli = !!g.original && engelli.has(g.original.user_id);
  const yorumSabitleyebilir = admin || g.user_id === kullaniciId;
    const alintiSayisi = g.reposts.filter((r) => !safMi(r)).length;

  const tepkiSayilari = TEPKILER.map((e) => ({
    emoji: e,
    sayi: g.likes.filter((l) => l.emoji === e).length,
  })).filter((t) => t.sayi > 0);

  function girisGerekli(islem: string) {
    setHata(`${islem} için giriş yapmalısın.`);
  }

  async function tepkiVer(emoji: string) {
    if (!kullaniciId) return girisGerekli("Tepki vermek");
    setHata("");
    setTepkiAcik(false);

    let hataMesaji: string | undefined;
    if (benimTepkim === emoji) {
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("user_id", kullaniciId)
        .eq("post_id", g.id);
      hataMesaji = error?.message;
    } else if (benimTepkim) {
      const { error } = await supabase
        .from("likes")
        .update({ emoji })
        .eq("user_id", kullaniciId)
        .eq("post_id", g.id);
      hataMesaji = error?.message;
    } else {
      const { error } = await supabase
        .from("likes")
        .insert({ user_id: kullaniciId, post_id: g.id, emoji });
      hataMesaji = error?.message;
    }

    if (hataMesaji) setHata(hataCevir(hataMesaji));
    else await onYenile();
  }

  async function kaydet() {
    if (!kullaniciId) return girisGerekli("Kaydetmek");
    setHata("");
    const { error } = kaydetti
      ? await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", kullaniciId)
          .eq("post_id", g.id)
      : await supabase
          .from("bookmarks")
          .insert({ user_id: kullaniciId, post_id: g.id });
    if (error) setHata(hataCevir(error.message));
    else await onYenile();
  }

  async function linkKopyala() {
    const adres = `${window.location.origin}/gonderi/${g.id}`;
    try {
      await navigator.clipboard.writeText(adres);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      setHata("Link kopyalanamadı: " + adres);
    }
  }

  async function yenidenPaylas() {
    setPaylasMenuAcik(false);
    if (!kullaniciId) return girisGerekli("Yeniden paylaşmak");
    setHata("");

    if (benimYenidenPaylasimim) {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", benimYenidenPaylasimim.id);
      if (error) setHata(hataCevir(error.message));
      else await onYenile();
      return;
    }

    const { error } = await supabase
      .from("posts")
      .insert({ user_id: kullaniciId, repost_of: g.id });
    if (error) setHata(hataCevir(error.message));
    else await onYenile();
  }

  function alintiyiAc() {
    setPaylasMenuAcik(false);
    if (!kullaniciId) return girisGerekli("Alıntılamak");
    setAlintiAcik(true);
  }

  async function alintiGonder(e: React.FormEvent) {
    e.preventDefault();
    if (!kullaniciId || !alintiMetni.trim() || gonderiliyor) return;
    setHata("");
    setGonderiliyor(true);
    const { error } = await supabase.from("posts").insert({
      user_id: kullaniciId,
      repost_of: g.id,
      content: alintiMetni.trim(),
    });
    if (error) setHata(hataCevir(error.message));
    else {
      setAlintiMetni("");
      setAlintiAcik(false);
      await onYenile();
    }
    setGonderiliyor(false);
  }

  function duzenlemeyiAc() {
    setMenuAcik(false);
    setDuzenleMetni(g.content ?? "");
    setDuzenleAcik(true);
    setHata("");
  }

  async function duzenlemeyiKaydet(e: React.FormEvent) {
    e.preventDefault();
    if (!kullaniciId || kaydediliyor) return;
    const yeni = duzenleMetni.trim();
    if (!yeni && fotolar.length === 0) {
      setHata("Gönderi boş olamaz. Silmek istiyorsan Sil'i kullan.");
      return;
    }
    if (yeni === (g.content ?? "")) {
      setDuzenleAcik(false);
      return;
    }
    setHata("");
    setKaydediliyor(true);
    const { data, error } = await supabase
      .from("posts")
      .update({ content: yeni || null })
      .eq("id", g.id)
      .select("id");
    if (error || !data || data.length === 0) {
      setHata(hataCevir(error?.message ?? "Gönderi düzenlenemedi."));
    } else {
      setDuzenleAcik(false);
      await onYenile();
    }
    setKaydediliyor(false);
  }

  async function gonderiSil() {
    setMenuAcik(false);
    if (
      !window.confirm(
        safYenidenPaylasim
          ? "Yeniden paylaşım geri alınsın mı?"
          : "Bu gönderi silinsin mi?"
      )
    )
      return;
    setHata("");
    const { data, error } = await supabase
      .from("posts")
      .delete()
      .eq("id", g.id)
      .select("id");
    if (error || !data || data.length === 0) {
      setHata(hataCevir(error?.message ?? "Gönderi silinemedi."));
      return;
    }
    if (onSilindi) onSilindi();
    else await onYenile();
  }

  async function gonderiSabitle(tur: "global" | "profil") {
    setMenuAcik(false);
    setHata("");
    const simdi = tur === "global" ? !!g.pinned_at : !!g.profile_pinned_at;
    const { error } = await supabase.rpc("gonderi_sabitle", {
      pid: g.id,
      tur,
      durum: !simdi,
    });
    if (error) setHata(error.message);
    else await onYenile();
  }

  async function sessizeAl() {
    setMenuAcik(false);
    if (!kullaniciId) return;
    setHata("");
    const { error } = await supabase
      .from("mutes")
      .insert({ muter_id: kullaniciId, muted_id: g.user_id });
    if (error && error.code !== "23505") {
      setHata(hataCevir(error.message));
      return;
    }
    engelOnbellekSifirla();
  }

  async function yorumYap(e: React.FormEvent) {
    e.preventDefault();
    if (!yorumMetni.trim()) return;
    if (!kullaniciId) return girisGerekli("Yorum yapmak");
    setHata("");
    const icerik =
      (cevapHedefi?.onek ? `@${cevapHedefi.ad} ` : "") + yorumMetni.trim();
    const { error } = await supabase.from("comments").insert({
      post_id: g.id,
      user_id: kullaniciId,
      parent_id: cevapHedefi?.parentId ?? null,
      content: icerik,
    });
    if (error) setHata(hataCevir(error.message));
    else {
      setYorumMetni("");
      setCevapHedefi(null);
      await onYenile();
    }
  }

  async function yorumSil(yorumId: string) {
    setHata("");
    const { data, error } = await supabase
      .from("comments")
      .delete()
      .eq("id", yorumId)
      .select("id");
    if (error || !data || data.length === 0) {
      setHata(hataCevir(error?.message ?? "Yorum silinemedi."));
    } else {
      await onYenile();
    }
  }

  async function yorumBegen(y: Yorum) {
    if (!kullaniciId) return girisGerekli("Beğenmek");
    setHata("");
    const begendi = y.comment_likes.some((l) => l.user_id === kullaniciId);
    const { error } = begendi
      ? await supabase
          .from("comment_likes")
          .delete()
          .eq("user_id", kullaniciId)
          .eq("comment_id", y.id)
      : await supabase
          .from("comment_likes")
          .insert({ user_id: kullaniciId, comment_id: y.id });
    if (error) setHata(hataCevir(error.message));
    else await onYenile();
  }

  async function yorumSabitle(y: Yorum) {
    setHata("");
    const { error } = await supabase.rpc("yorum_sabitle", {
      cid: y.id,
      durum: !y.pinned_at,
    });
    if (error) setHata(error.message);
    else await onYenile();
  }

  function yanitla(y: Yorum) {
    const yorumcu = y.profiles?.username ?? "bilinmiyor";
    setCevapHedefi({
      parentId: y.parent_id ?? y.id,
      ad: yorumcu,
      onek: !!y.parent_id,
    });
    setTimeout(() => yorumKutusuRef.current?.focus(), 0);
  }

  function yorumKutusu(y: Yorum, kucuk = false) {
    const yorumcu = y.profiles?.username ?? "bilinmiyor";
    const begendi = y.comment_likes.some((l) => l.user_id === kullaniciId);
    return (
      <div key={y.id} className="flex gap-2">
        <Avatar
          url={y.profiles?.avatar_url}
          ad={yorumcu}
          boyut={kucuk ? "h-7 w-7" : "h-8 w-8"}
          cerceve={y.profiles?.equipped_frame}
        />
        <div
          className={`min-w-0 flex-1 rounded-2xl bg-card2 p-3 text-sm ${
            y.pinned_at ? "ring-1 ring-brand" : ""
          }`}
        >
          {y.pinned_at && (
            <p className="mb-1 text-[11px] font-semibold text-brand">
              📌 Sabitlenmiş yorum
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate">
              <Link
                href={`/profil/${yorumcu}`}
                className="font-semibold hover:text-brand"
              >
                @{yorumcu}
              </Link>
              {y.profiles?.title && <UnvanRozeti ad={y.profiles.title.name} />}
            </span>
            <span className="shrink-0 text-xs text-muted">
              {zamanOnce(y.created_at)}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap">
            <MetinGoster metin={y.content} />
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <button
              onClick={() => yorumBegen(y)}
              className={`text-xs font-semibold ${
                begendi ? "text-brand" : "text-muted hover:text-brand"
              }`}
            >
              {begendi ? "♥" : "♡"} {y.comment_likes.length}
            </button>
            {kullaniciId && (
              <button
                onClick={() => yanitla(y)}
                className="text-xs font-semibold text-muted hover:text-brand"
              >
                ↩ Yanıtla
              </button>
            )}
            {yorumSabitleyebilir && !y.parent_id && (
              <button
                onClick={() => yorumSabitle(y)}
                className="text-xs font-semibold text-muted hover:text-brand"
              >
                📌 {y.pinned_at ? "Sabiti kaldır" : "Sabitle"}
              </button>
            )}
            {kullaniciId && y.user_id !== kullaniciId && (
              <button
                onClick={() =>
                  setRaporYorumId(raporYorumId === y.id ? null : y.id)
                }
                className="text-xs font-semibold text-muted hover:text-brand"
              >
                ⚑ Şikayet
              </button>
            )}
            {(admin || y.user_id === kullaniciId) && (
              <button
                onClick={() => yorumSil(y.id)}
                className="text-xs font-semibold text-red-400 hover:text-red-300"
              >
                Sil
              </button>
            )}
          </div>
          {raporYorumId === y.id && kullaniciId && (
            <SikayetFormu
              hedefTuru="comment"
              hedefId={y.id}
              kullaniciId={kullaniciId}
              onKapat={() => setRaporYorumId(null)}
            />
          )}
        </div>
      </div>
    );
  }

  function galeri() {
    if (fotolar.length === 0) return null;

    if (fotolar.length === 1) {
      return (
        <button
          type="button"
          onClick={() => setBuyukSira(0)}
          className="mt-3 block w-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fotolar[0]}
            alt="Gönderi fotoğrafı"
            className="max-h-[28rem] w-full rounded-2xl object-cover"
          />
        </button>
      );
    }

    return (
      <div className="mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
        {fotolar.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => setBuyukSira(i)}
            className="relative w-[85%] shrink-0 snap-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Fotoğraf ${i + 1}`}
              className="h-72 w-full rounded-2xl object-cover"
            />
            <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
              {i + 1}/{fotolar.length}
            </span>
          </button>
        ))}
      </div>
    );
  }

  // Gizlenen (engelli ya da sessize alınmış) kişinin gönderisi tamamen gizlenir
  if (engelli.has(g.user_id)) return null;

  // Saf yeniden paylaşım: sadece "X yeniden paylaştı" + orijinal gönderi
  if (safYenidenPaylasim) {
    return (
      <article className="rounded-3xl border border-line bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>🔁</span>
          <Link
            href={`/profil/${yazar}`}
            className="font-semibold hover:text-brand"
          >
            @{yazar}
          </Link>
          <span>yeniden paylaştı · {zamanOnce(g.created_at)}</span>
          {silebilir && (
            <button
              onClick={gonderiSil}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              Geri al
            </button>
          )}
        </div>
        {orijinalEngelli ? (
          <EngelliKutu />
        ) : g.original ? (
          <OrijinalKutu o={g.original} />
        ) : (
          <p className="mt-3 text-sm text-muted">Bu gönderi artık yok.</p>
        )}
        {hata && <p className="mt-2 text-sm text-yellow-500">{hata}</p>}
      </article>
    );
  }

  const ustYorumlar = yorumlar
    .filter((y) => !y.parent_id)
    .sort((a, b) => (b.pinned_at ? 1 : 0) - (a.pinned_at ? 1 : 0));
  const cevaplar = (ustId: string) =>
    yorumlar.filter((y) => y.parent_id === ustId);

  const menuOgeleri =
    duzenleyebilir || admin || sikayetEdebilir || silebilir;

  const ogeSinifi = "block w-full px-4 py-3 text-left hover:bg-card2";

  return (
    <article className="rounded-3xl border border-line bg-card p-4 shadow-sm">
      {(g.pinned_at || (profilde && g.profile_pinned_at)) && (
        <p className="mb-2 text-xs font-semibold text-brand">
          {g.pinned_at ? "📌 Sabitlenmiş gönderi" : "📍 Profilde sabit"}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Avatar
          url={g.profiles?.avatar_url}
          ad={yazar}
          cerceve={g.profiles?.equipped_frame}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center">
            <Link
              href={`/profil/${yazar}`}
              className="font-semibold hover:text-brand"
            >
              @{yazar}
            </Link>
            {g.profiles?.title && <UnvanRozeti ad={g.profiles.title.name} />}
          </div>
          <p className="text-xs text-muted">
            <Link
              href={`/gonderi/${g.id}`}
              title={new Date(g.created_at).toLocaleString("tr-TR")}
              className="hover:text-ink"
            >
              {zamanOnce(g.created_at)}
            </Link>
            {g.edited_at && (
              <span
                className="ml-1"
                title={`Düzenlendi: ${new Date(g.edited_at).toLocaleString(
                  "tr-TR"
                )}`}
              >
                · düzenlendi
              </span>
            )}
            {kategori && g.category !== "genel" && (
              <span className="ml-2 rounded-full bg-card2 px-2 py-0.5 text-brand">
                {kategori.ikon} {kategori.etiket}
              </span>
            )}
          </p>
        </div>
        {g.groups && (
          <Link
            href={`/gruplar/${g.groups.slug}`}
            className="hidden shrink-0 rounded-full bg-card2 px-3 py-1 text-xs font-semibold text-brand hover:opacity-80 sm:block"
          >
            🎤 {g.groups.name}
          </Link>
        )}

        {kullaniciId && menuOgeleri && (
          <div className="relative">
            <button
              onClick={() => setMenuAcik(!menuAcik)}
              aria-label="Daha fazla"
              className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-muted hover:bg-card2"
            >
              ⋯
            </button>
            {menuAcik && (
              <>
                <button
                  aria-label="Menüyü kapat"
                  onClick={() => setMenuAcik(false)}
                  className="fixed inset-0 z-20 cursor-default"
                />
                <div className="absolute right-0 top-full z-30 mt-1 w-60 overflow-hidden rounded-2xl border border-line bg-card text-sm shadow-xl">
                  {duzenleyebilir && (
                    <button onClick={duzenlemeyiAc} className={ogeSinifi}>
                      ✏️ Düzenle
                    </button>
                  )}
                  {duzenleyebilir && (
                    <button
                      onClick={() => gonderiSabitle("profil")}
                      className={ogeSinifi}
                    >
                      📍{" "}
                      {g.profile_pinned_at
                        ? "Profildeki sabiti kaldır"
                        : "Profilimde sabitle"}
                    </button>
                  )}
                  {admin && (
                    <button
                      onClick={() => gonderiSabitle("global")}
                      className={ogeSinifi}
                    >
                      📌{" "}
                      {g.pinned_at
                        ? "Genel sabiti kaldır"
                        : "Ana akışta sabitle"}
                    </button>
                  )}
                  {sikayetEdebilir && (
                    <button
                      onClick={() => {
                        setMenuAcik(false);
                        setGonderiRaporAcik(true);
                      }}
                      className={ogeSinifi}
                    >
                      ⚑ Şikayet et
                    </button>
                  )}
                  {sikayetEdebilir && (
                    <button onClick={sessizeAl} className={ogeSinifi}>
                      🔇 @{yazar} sessize al
                    </button>
                  )}
                  {silebilir && (
                    <button
                      onClick={gonderiSil}
                      className={`${ogeSinifi} text-red-400`}
                    >
                      🗑 Sil
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {duzenleAcik ? (
        <form onSubmit={duzenlemeyiKaydet} className="mt-3 space-y-2">
          <textarea
            value={duzenleMetni}
            onChange={(e) => setDuzenleMetni(e.target.value)}
            maxLength={500}
            rows={4}
            autoFocus
            className="w-full resize-none rounded-2xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted">
              {duzenleMetni.length}/500
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDuzenleAcik(false)}
                className="rounded-xl bg-card2 px-4 py-2 text-sm hover:opacity-80"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={kaydediliyor}
                className="btn-brand rounded-xl px-5 py-2 text-sm font-semibold"
              >
                {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        g.content && (
          <p className="mt-3 whitespace-pre-wrap">
            <MetinGoster metin={g.content} />
          </p>
        )
      )}

      {galeri()}

      {g.repost_of &&
        (orijinalEngelli ? (
          <EngelliKutu />
        ) : g.original ? (
          <OrijinalKutu o={g.original} />
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-line p-3 text-sm text-muted">
            Alıntılanan gönderi artık yok.
          </p>
        ))}

      {tepkiSayilari.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tepkiSayilari.map((t) => (
            <button
              key={t.emoji}
              onClick={() => tepkiVer(t.emoji)}
              className={`rounded-full border px-2.5 py-0.5 text-sm transition hover:-translate-y-0.5 ${
                benimTepkim === t.emoji
                  ? "border-brand bg-card2 font-semibold"
                  : "border-line bg-card2"
              }`}
            >
              {t.emoji} {t.sayi}
            </button>
          ))}
        </div>
      )}
            {alintiSayisi > 0 && (
        <Link
          href={`/gonderi/${g.id}/alintilar`}
          className="mt-3 inline-block text-sm font-semibold text-brand hover:underline"
        >
          ✍️ {alintiSayisi} alıntı
        </Link>
      )}
      <div className="mt-3 flex items-center justify-between gap-1 border-t border-line pt-3 text-sm">
        <div className="relative">
          <button
            onClick={() => setTepkiAcik(!tepkiAcik)}
            className={`rounded-xl px-3 py-2 transition hover:bg-card2 ${
              benimTepkim ? "font-semibold text-brand" : "text-muted"
            }`}
          >
            {benimTepkim ?? "♡"} {g.likes.length}
          </button>
          {tepkiAcik && (
            <div className="absolute bottom-full left-0 z-20 mb-2 flex gap-1 rounded-full border border-line bg-card p-1.5 shadow-lg">
              {TEPKILER.map((e) => (
                <button
                  key={e}
                  onClick={() => tepkiVer(e)}
                  className={`rounded-full px-2 py-1 text-xl transition hover:scale-125 ${
                    benimTepkim === e ? "bg-card2" : ""
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setAcik(!acik)}
          className="rounded-xl px-3 py-2 text-muted transition hover:bg-card2"
        >
          💬 {yorumlar.length}
        </button>

        <div className="relative">
          <button
            onClick={() => setPaylasMenuAcik(!paylasMenuAcik)}
            className={`rounded-xl px-3 py-2 transition hover:bg-card2 ${
              benimYenidenPaylasimim ? "font-semibold text-brand" : "text-muted"
            }`}
          >
            🔁 {g.reposts.length}
          </button>
          {paylasMenuAcik && (
            <div className="absolute bottom-full left-0 z-20 mb-2 w-48 overflow-hidden rounded-2xl border border-line bg-card shadow-lg">
              <button
                onClick={yenidenPaylas}
                className="block w-full px-4 py-3 text-left hover:bg-card2"
              >
                {benimYenidenPaylasimim
                  ? "↩ Paylaşımı geri al"
                  : "🔁 Yeniden paylaş"}
              </button>
              <button
                onClick={alintiyiAc}
                className="block w-full px-4 py-3 text-left hover:bg-card2"
              >
                ✍️ Alıntıla
              </button>
            </div>
          )}
        </div>

                <button
          onClick={kaydet}
          title={kaydetti ? "Kayıtlardan çıkar" : "Kaydet"}
          className={`rounded-xl px-3 py-2 text-sm transition ${
            kaydetti
              ? "btn-brand font-semibold"
              : "text-muted hover:bg-card2"
          }`}
          aria-label={kaydetti ? "Kayıtlardan çıkar" : "Kaydet"}
        >
          🔖{kaydetti ? " Kayıtlı" : ""}
        </button>
        <button
          onClick={linkKopyala}
          className="rounded-xl px-3 py-2 text-muted transition hover:bg-card2"
        >
          {kopyalandi ? "✓" : "🔗"}
        </button>
      </div>

      {hata && <p className="mt-2 text-sm text-yellow-500">{hata}</p>}

      {gonderiRaporAcik && kullaniciId && (
        <SikayetFormu
          hedefTuru="post"
          hedefId={g.id}
          kullaniciId={kullaniciId}
          onKapat={() => setGonderiRaporAcik(false)}
        />
      )}

      {alintiAcik && (
        <form
          onSubmit={alintiGonder}
          className="mt-3 space-y-2 rounded-2xl border border-line bg-card2 p-3"
        >
          <p className="text-xs font-semibold text-muted">
            ✍️ @{yazar} gönderisini alıntılıyorsun
          </p>
          <textarea
            value={alintiMetni}
            onChange={(e) => setAlintiMetni(e.target.value)}
            placeholder="Düşüncelerini ekle..."
            maxLength={500}
            rows={3}
            autoFocus
            className="w-full resize-none rounded-xl bg-card p-3 text-sm text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setAlintiAcik(false);
                setAlintiMetni("");
              }}
              className="rounded-xl bg-card px-4 py-2 text-sm hover:opacity-80"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={!alintiMetni.trim() || gonderiliyor}
              className="btn-brand rounded-xl px-5 py-2 text-sm font-semibold"
            >
              {gonderiliyor ? "Paylaşılıyor..." : "Alıntıla"}
            </button>
          </div>
        </form>
      )}

      {acik && (
        <div className="mt-3 space-y-3 border-t border-line pt-3">
          {yorumlar.length === 0 && (
            <p className="text-sm text-muted">Henüz yorum yok.</p>
          )}

          {ustYorumlar.map((u) => (
            <div key={u.id} className="space-y-2">
              {yorumKutusu(u)}
              {cevaplar(u.id).length > 0 && (
                <div className="ml-8 space-y-2 border-l border-line pl-3">
                  {cevaplar(u.id).map((r) => yorumKutusu(r, true))}
                </div>
              )}
            </div>
          ))}

          {kullaniciId && (
            <form onSubmit={yorumYap} className="space-y-1.5">
              {cevapHedefi && (
                <p className="flex items-center gap-2 text-xs text-muted">
                  ↩ @{cevapHedefi.ad} kişisine yanıt veriyorsun
                  <button
                    type="button"
                    onClick={() => setCevapHedefi(null)}
                    className="text-red-400 hover:text-red-300"
                  >
                    İptal
                  </button>
                </p>
              )}
              <div className="flex gap-2">
                <input
                  ref={yorumKutusuRef}
                  value={yorumMetni}
                  onChange={(e) => setYorumMetni(e.target.value)}
                  placeholder={cevapHedefi ? "Yanıtını yaz..." : "Yorum yaz..."}
                  maxLength={300}
                  className="min-w-0 flex-1 rounded-2xl bg-card2 p-3 text-sm text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand"
                />
                <button
                  type="submit"
                  disabled={!yorumMetni.trim()}
                  className="btn-brand rounded-2xl px-4 py-2 text-sm font-semibold"
                >
                  Gönder
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {buyukSira !== null && fotolar[buyukSira] && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/90 p-4"
          onClick={() => setBuyukSira(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fotolar[buyukSira]}
            alt="Gönderi fotoğrafı"
            className="max-h-[80vh] max-w-full rounded-xl object-contain"
          />
          {fotolar.length > 1 && (
            <div className="flex items-center gap-4 text-white">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setBuyukSira((buyukSira - 1 + fotolar.length) % fotolar.length);
                }}
                className="rounded-full bg-white/20 px-4 py-2 text-xl"
              >
                ‹
              </button>
              <span className="text-sm">
                {buyukSira + 1} / {fotolar.length}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setBuyukSira((buyukSira + 1) % fotolar.length);
                }}
                className="rounded-full bg-white/20 px-4 py-2 text-xl"
              >
                ›
              </button>
            </div>
          )}
          <a
            href={fotolar[buyukSira]}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-sm text-white underline"
          >
            Aç / indir
          </a>
        </div>
      )}
    </article>
  );
}