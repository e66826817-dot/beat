"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../../lib/supabase";

type Sikayet = {
  id: string;
  target_type: "post" | "comment" | "user";
  target_id: string;
  reason: string;
  details: string | null;
  status: "open" | "closed";
  created_at: string;
  profiles: { username: string } | null;
};

type Hedef = {
  var: boolean;
  metin: string;
  sahip: string;
  link?: string;
};

const SEBEP: Record<string, string> = {
  spam: "Spam / reklam",
  taciz: "Taciz / zorbalık",
  uygunsuz: "Uygunsuz içerik",
  diger: "Diğer",
};

const TUR: Record<string, string> = {
  post: "Gönderi",
  comment: "Yorum",
  user: "Kullanıcı",
  video: "Video",
  channel_post: "Kanal gönderisi",
};

export default function AdminSikayetlerSayfasi() {
  const supabase = createClient();

  const [yukleniyor, setYukleniyor] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [sikayetler, setSikayetler] = useState<Sikayet[]>([]);
  const [hedefler, setHedefler] = useState<Record<string, Hedef>>({});
  const [filtre, setFiltre] = useState<"open" | "closed">("open");
  const [hata, setHata] = useState("");

  async function getir(durum: "open" | "closed") {
    setHata("");
    const { data, error } = await supabase
      .from("reports")
      .select(
        "id, target_type, target_id, reason, details, status, created_at, profiles!reports_reporter_id_fkey(username)"
      )
      .eq("status", durum)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setHata(error.message);
      return;
    }
    const liste = (data as unknown as Sikayet[]) || [];
    setSikayetler(liste);

    const harita: Record<string, Hedef> = {};
    const idler = (tur: string) =>
      liste.filter((s) => s.target_type === tur).map((s) => s.target_id);

    const gonderiIdleri = idler("post");
    if (gonderiIdleri.length > 0) {
      const { data: p } = await supabase
        .from("posts")
        .select("id, content, profiles!posts_user_id_fkey(username)")
        .in("id", gonderiIdleri);
      for (const x of (p as unknown as {
        id: string;
        content: string | null;
        profiles: { username: string } | null;
      }[]) || []) {
        harita[x.id] = {
          var: true,
          metin: x.content || "(metinsiz gönderi)",
          sahip: x.profiles?.username ?? "bilinmiyor",
          link: `/gonderi/${x.id}`,
        };
      }
    }

    const yorumIdleri = idler("comment");
    if (yorumIdleri.length > 0) {
      const { data: c } = await supabase
        .from("comments")
        .select("id, post_id, content, profiles!comments_user_id_fkey(username)")
        .in("id", yorumIdleri);
      for (const x of (c as unknown as {
        id: string;
        post_id: string;
        content: string;
        profiles: { username: string } | null;
      }[]) || []) {
        harita[x.id] = {
          var: true,
          metin: x.content,
          sahip: x.profiles?.username ?? "bilinmiyor",
          link: `/gonderi/${x.post_id}`,
        };
      }
    }

        const videoIdleri = idler("video");
    if (videoIdleri.length > 0) {
      const { data: vv } = await supabase
        .from("videos")
        .select("id, caption, profiles!videos_user_id_fkey(username)")
        .in("id", videoIdleri);
      for (const x of (vv as unknown as {
        id: string;
        caption: string | null;
        profiles: { username: string } | null;
      }[]) || []) {
        harita[x.id] = {
          var: true,
          metin: x.caption || "(açıklamasız video)",
          sahip: x.profiles?.username ?? "bilinmiyor",
          link: "/videolar",
        };
      }
    }
        const kanalIdleri = idler("channel_post");
    if (kanalIdleri.length > 0) {
      const { data: kp } = await supabase
        .from("channel_posts")
        .select("id, body, channels(slug, name)")
        .in("id", kanalIdleri);
      for (const x of (kp as unknown as {
        id: string;
        body: string | null;
        channels: { slug: string; name: string } | null;
      }[]) || []) {
        harita[x.id] = {
          var: true,
          metin: x.body || "(fotoğraflı gönderi)",
          sahip: x.channels?.name ?? "kanal",
          link: x.channels ? `/kanallar/${x.channels.slug}` : "/kanallar",
        };
      }
    }
    const kullaniciIdleri = idler("user");
    if (kullaniciIdleri.length > 0) {
      const { data: u } = await supabase
        .from("profiles")
        .select("id, username, bio")
        .in("id", kullaniciIdleri);
      for (const x of u || []) {
        harita[x.id] = {
          var: true,
          metin: x.bio || "(biyografi yok)",
          sahip: x.username,
          link: `/profil/${x.username}`,
        };
      }
    }

    setHedefler(harita);
  }

  useEffect(() => {
    async function baslat() {
      const { data: kullanici } = await supabase.auth.getUser();
      if (kullanici.user) {
        const { data: profil } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", kullanici.user.id)
          .single();
        const yetkili = profil?.role === "admin";
        setAdmin(yetkili);
        if (yetkili) await getir("open");
      }
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function filtreDegistir(yeni: "open" | "closed") {
    setFiltre(yeni);
    await getir(yeni);
  }

  async function durumDegistir(s: Sikayet, durum: "open" | "closed") {
    setHata("");
    const { error } = await supabase
      .from("reports")
      .update({ status: durum })
      .eq("id", s.id);
    if (error) setHata(error.message);
    else await getir(filtre);
  }

  async function icerigiSil(s: Sikayet) {
    if (s.target_type === "user") return;
    if (!window.confirm("Bu içerik kalıcı olarak silinsin mi?")) return;
    setHata("");
    const tablo = s.target_type === "post" ? "posts" : "comments";
    const { data, error } = await supabase
      .from(tablo)
      .delete()
      .eq("id", s.target_id)
      .select("id");
    if (error || !data || data.length === 0) {
      setHata(error?.message ?? "İçerik silinemedi (zaten silinmiş olabilir).");
      return;
    }
    const { error: kapatmaHatasi } = await supabase
      .from("reports")
      .update({ status: "closed" })
      .eq("target_type", s.target_type)
      .eq("target_id", s.target_id);
    if (kapatmaHatasi) setHata(kapatmaHatasi.message);
    await getir(filtre);
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <div className="h-40 animate-pulse rounded-2xl border border-line bg-card" />
      </main>
    );
  }

  if (!admin) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <p className="text-4xl">🔒</p>
        <p className="text-muted">Bu sayfa sadece adminler içindir.</p>
        <Link href="/" className="text-brand hover:underline">
          Ana sayfaya dön
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold">Şikayetler</h2>
        <div className="flex gap-3 text-sm text-muted">
          <Link href="/admin/gruplar" className="hover:text-ink">
            Gruplar
          </Link>
          <Link href="/admin/soru" className="hover:text-ink">
            Soru
          </Link>
        </div>
      </div>

      <div className="flex gap-2">
        {(
          [
            ["open", "Bekleyen"],
            ["closed", "Kapatılan"],
          ] as const
        ).map(([anahtar, etiket]) => (
          <button
            key={anahtar}
            onClick={() => filtreDegistir(anahtar)}
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

      {sikayetler.length === 0 && !hata && (
        <div className="rounded-2xl border border-dashed border-line py-12 text-center text-muted">
          <p className="text-4xl">✅</p>
          <p className="mt-2">
            {filtre === "open"
              ? "Bekleyen şikayet yok."
              : "Kapatılmış şikayet yok."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {sikayetler.map((s) => {
          const h = hedefler[s.target_id];
          return (
            <section
              key={s.id}
              className="space-y-2 rounded-2xl border border-line bg-card p-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-card2 px-2.5 py-1 font-semibold text-brand">
                  {TUR[s.target_type]}
                </span>
                <span className="rounded-full bg-card2 px-2.5 py-1">
                  {SEBEP[s.reason] ?? s.reason}
                </span>
                <span className="text-muted">
                  @{s.profiles?.username ?? "bilinmiyor"} ·{" "}
                  {new Date(s.created_at).toLocaleString("tr-TR")}
                </span>
              </div>

              {s.details && (
                <p className="text-sm text-muted">
                  Açıklama: “{s.details}”
                </p>
              )}

              {h ? (
                <div className="rounded-xl bg-card2 p-3 text-sm">
                  <p className="text-xs font-semibold text-muted">
                    @{h.sahip}
                  </p>
                  <p className="mt-1 line-clamp-5 whitespace-pre-wrap">
                    {h.metin}
                  </p>
                  {h.link && (
                    <Link
                      href={h.link}
                      className="mt-2 inline-block text-xs font-semibold text-brand hover:underline"
                    >
                      İçeriğe git →
                    </Link>
                  )}
                </div>
              ) : (
                <p className="rounded-xl bg-card2 p-3 text-sm text-muted">
                  İçerik artık yok (silinmiş).
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                {filtre === "open" ? (
                  <>
                    {h && s.target_type !== "user" && (
                      <button
                        onClick={() => icerigiSil(s)}
                        className="rounded-lg bg-card2 px-4 py-2 text-sm text-red-400 hover:opacity-80"
                      >
                        İçeriği sil
                      </button>
                    )}
                    <button
                      onClick={() => durumDegistir(s, "closed")}
                      className="btn-brand rounded-lg px-4 py-2 text-sm font-semibold"
                    >
                      Şikayeti kapat
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => durumDegistir(s, "open")}
                    className="rounded-lg bg-card2 px-4 py-2 text-sm hover:opacity-80"
                  >
                    Yeniden aç
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}