"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";

type Tur =
  | "like"
  | "comment"
  | "follow"
  | "reply"
  | "repost"
  | "quote"
  | "mention"
  | "title_worn";

type Bildirim = {
  id: string;
  type: Tur;
  post_id: string | null;
  info: string | null;
  is_read: boolean;
  created_at: string;
  profiles: { username: string } | null;
  posts: { content: string | null } | null;
};

const IKONLAR: Record<Tur, string> = {
  like: "♥",
  comment: "💬",
  follow: "👤",
  reply: "↩",
  repost: "🔁",
  quote: "✍️",
  mention: "@",
  title_worn: "✦",
};

const METINLER: Record<Tur, string> = {
  like: "gönderine tepki verdi",
  comment: "gönderine yorum yaptı",
  follow: "seni takip etmeye başladı",
  reply: "yorumuna yanıt verdi",
  repost: "gönderini yeniden paylaştı",
  quote: "gönderini alıntıladı",
  mention: "seni bir gönderide etiketledi",
  title_worn: "oluşturduğun ünvanı taktı",
};

export default function BildirimlerSayfasi() {
  const supabase = createClient();
  const [bildirimler, setBildirimler] = useState<Bildirim[]>([]);
  const [girisVar, setGirisVar] = useState(true);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");

  useEffect(() => {
    async function baslat() {
      const { data: kullanici } = await supabase.auth.getUser();
      if (!kullanici.user) {
        setGirisVar(false);
        setYukleniyor(false);
        return;
      }

      const { data, error } = await supabase
        .from("notifications")
        .select(
          "id, type, post_id, info, is_read, created_at, profiles!notifications_actor_id_fkey(username), posts!notifications_post_id_fkey(content)"
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        setHata(error.message);
      } else {
        setBildirimler((data as unknown as Bildirim[]) || []);
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", kullanici.user.id)
          .eq("is_read", false);
        window.dispatchEvent(new Event("bildirim-okundu"));
      }
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-2xl border border-line bg-card"
          />
        ))}
      </main>
    );
  }

  if (!girisVar) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <p className="text-4xl">🔔</p>
        <p className="text-muted">Bildirimleri görmek için giriş yapmalısın.</p>
        <Link href="/giris" className="text-brand hover:underline">
          Giriş yap
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <h2 className="text-2xl font-extrabold">Bildirimler</h2>

      {hata && (
        <p className="rounded-xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}

      {bildirimler.length === 0 && !hata && (
        <div className="rounded-2xl border border-dashed border-line py-12 text-center text-muted">
          <p className="text-4xl">🔔</p>
          <p className="mt-2 px-4">
            Henüz bildirim yok. Biri gönderine tepki verince, yorum yapınca,
            yanıtlayınca, paylaşınca, etiketleyince, ünvanını takınca ya da
            seni takip edince burada görünür.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {bildirimler.map((b) => {
          const kisi = b.profiles?.username ?? "bilinmiyor";
          const hedef =
            b.type === "follow" || b.type === "title_worn"
              ? `/profil/${kisi}`
              : b.post_id
              ? `/gonderi/${b.post_id}`
              : "/";
          const altMetin =
            b.type === "title_worn" ? b.info : b.posts?.content ?? null;
          return (
            <Link
              key={b.id}
              href={hedef}
              className={`flex items-start gap-3 rounded-2xl border bg-card p-4 transition hover:-translate-y-0.5 ${
                b.is_read ? "border-line" : "border-brand"
              }`}
            >
              <span className="text-2xl">{IKONLAR[b.type] ?? "🔔"}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold">@{kisi}</span>{" "}
                  {METINLER[b.type] ?? "bir işlem yaptı"}
                </p>
                {altMetin && (
                  <p className="mt-0.5 truncate text-xs text-muted">
                    “{altMetin}”
                  </p>
                )}
                <p className="mt-1 text-xs text-muted">
                  {new Date(b.created_at).toLocaleString("tr-TR")}
                </p>
              </div>
              {!b.is_read && (
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
              )}
            </Link>
          );
        })}
      </div>
    </main>
  );
}