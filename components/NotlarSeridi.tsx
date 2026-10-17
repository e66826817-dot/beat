"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase";
import { Avatar, hataCevir, useEngelliler } from "./PostCard";
import SarkiSecici, { SarkiDegeri, useSanatcilar } from "./SarkiSecici";
import YoutubeOynatici from "./YoutubeOynatici";
import { youtubeId } from "../lib/youtube";

type Not = {
  user_id: string;
  body: string;
  song_title: string | null;
  video_id: string | null;
  created_at: string;
  artist: { name: string } | null;
  profiles: {
    username: string;
    avatar_url: string | null;
    equipped_frame: string | null;
  } | null;
};

const SORGU =
  "user_id, body, song_title, video_id, created_at, artist:artist_id(name), profiles!profile_notes_user_id_fkey(username, avatar_url, equipped_frame)";

function kalanMetni(olusma: string) {
  const kalan = new Date(olusma).getTime() + 86400000 - Date.now();
  const sa = Math.max(0, Math.ceil(kalan / 3600000));
  return `${sa} sa kaldı`;
}

export default function NotlarSeridi({
  kullaniciId,
}: {
  kullaniciId: string | null;
}) {
  const supabase = createClient();
  const sanatcilar = useSanatcilar();
  const gizli = useEngelliler(kullaniciId);
  const [notlar, setNotlar] = useState<Not[]>([]);
  const [takip, setTakip] = useState<Set<string>>(new Set());
  const [goruntulenen, setGoruntulenen] = useState<Not | null>(null);
  const [duzenleAcik, setDuzenleAcik] = useState(false);
  const [govde, setGovde] = useState("");
  const [sarki, setSarki] = useState<SarkiDegeri>({
    artistId: "",
    title: "",
    link: "",
  });
  const [hata, setHata] = useState("");
  const [kaydediliyor, setKaydediliyor] = useState(false);

  async function getir() {
    const { data } = await supabase
      .from("profile_notes")
      .select(SORGU)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(40);
    setNotlar((data as unknown as Not[]) || []);
    if (kullaniciId) {
      const { data: f } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", kullaniciId);
      setTakip(new Set((f || []).map((x) => x.following_id)));
    }
  }

  useEffect(() => {
    getir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kullaniciId]);

  const benimNotum = notlar.find((n) => n.user_id === kullaniciId) ?? null;
  const digerleri = notlar
    .filter((n) => n.user_id !== kullaniciId && !gizli.has(n.user_id))
    .sort(
      (a, b) => (takip.has(b.user_id) ? 1 : 0) - (takip.has(a.user_id) ? 1 : 0)
    );

  function duzenlemeyiAc() {
    setGovde(benimNotum?.body ?? "");
    setSarki({
      artistId: "",
      title: benimNotum?.song_title ?? "",
      link: benimNotum?.video_id ? `https://youtu.be/${benimNotum.video_id}` : "",
    });
    setHata("");
    setDuzenleAcik(true);
  }

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    if (!kullaniciId || kaydediliyor) return;
    const baslik = sarki.title.trim();
    const videoId = youtubeId(sarki.link);
    if (sarki.link.trim() && !videoId) {
      setHata("Geçerli bir YouTube bağlantısı gir.");
      return;
    }
    if (baslik && !sarki.artistId) {
      setHata("Şarkı için TR pop sanatçısı seç.");
      return;
    }
    if (videoId && !baslik) {
      setHata("Şarkının adını yaz.");
      return;
    }
    if (!govde.trim() && !baslik) {
      setHata("Bir not yaz ya da şarkı ekle.");
      return;
    }
    setHata("");
    setKaydediliyor(true);
    const { error } = await supabase.from("profile_notes").upsert(
      {
        user_id: kullaniciId,
        body: govde.trim(),
        artist_id: baslik ? sarki.artistId : null,
        song_title: baslik || null,
        video_id: videoId,
      },
      { onConflict: "user_id" }
    );
    if (error) setHata(hataCevir(error.message));
    else {
      setDuzenleAcik(false);
      await getir();
    }
    setKaydediliyor(false);
  }

  async function sil() {
    if (!kullaniciId) return;
    await supabase.from("profile_notes").delete().eq("user_id", kullaniciId);
    setDuzenleAcik(false);
    await getir();
  }

  if (!kullaniciId && digerleri.length === 0) return null;

  const balon = (n: Not) =>
    `${n.song_title ? "🎵 " : ""}${n.body || n.song_title || ""}`;

  return (
    <section className="rounded-3xl border border-line bg-card p-3">
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 pt-2">
        {kullaniciId && (
          <button
            onClick={duzenlemeyiAc}
            className="w-20 shrink-0 text-center"
          >
            <div className="mx-auto mb-1 line-clamp-2 min-h-8 rounded-2xl bg-card2 px-2 py-1 text-[11px] text-muted">
              {benimNotum ? balon(benimNotum) : "Not bırak…"}
            </div>
            <div className="btn-brand mx-auto flex h-12 w-12 items-center justify-center rounded-full text-2xl">
              {benimNotum ? "✏️" : "+"}
            </div>
            <p className="mt-1 truncate text-[11px] font-semibold">Notun</p>
          </button>
        )}

        {digerleri.map((n) => (
          <button
            key={n.user_id}
            onClick={() => setGoruntulenen(n)}
            className="w-20 shrink-0 text-center"
          >
            <div className="mx-auto mb-1 line-clamp-2 min-h-8 rounded-2xl bg-card2 px-2 py-1 text-[11px]">
              {balon(n)}
            </div>
            <div className="flex justify-center">
              <Avatar
                url={n.profiles?.avatar_url}
                ad={n.profiles?.username ?? "?"}
                boyut="h-12 w-12"
                cerceve={n.profiles?.equipped_frame}
              />
            </div>
            <p className="mt-1 truncate text-[11px] text-muted">
              {n.profiles?.username}
            </p>
          </button>
        ))}
      </div>

      {goruntulenen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => setGoruntulenen(null)}
        >
          <div
            className="w-full max-w-sm space-y-3 rounded-3xl border border-line bg-card p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <Avatar
                url={goruntulenen.profiles?.avatar_url}
                ad={goruntulenen.profiles?.username ?? "?"}
                cerceve={goruntulenen.profiles?.equipped_frame}
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/profil/${goruntulenen.profiles?.username ?? ""}`}
                  className="font-semibold hover:text-brand"
                >
                  @{goruntulenen.profiles?.username}
                </Link>
                <p className="text-xs text-muted">
                  {kalanMetni(goruntulenen.created_at)}
                </p>
              </div>
              <button
                onClick={() => setGoruntulenen(null)}
                className="text-xl text-muted"
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>
            {goruntulenen.body && (
              <p className="whitespace-pre-wrap text-lg">{goruntulenen.body}</p>
            )}
            {goruntulenen.song_title && (
              <p className="text-sm">
                🎵{" "}
                <b>
                  {goruntulenen.artist ? `${goruntulenen.artist.name} – ` : ""}
                  {goruntulenen.song_title}
                </b>
              </p>
            )}
            {goruntulenen.video_id && (
              <YoutubeOynatici
                videoId={goruntulenen.video_id}
                baslik={goruntulenen.song_title ?? "Şarkı"}
              />
            )}
          </div>
        </div>
      )}

      {duzenleAcik && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => setDuzenleAcik(false)}
        >
          <form
            onSubmit={kaydet}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-sm space-y-3 overflow-y-auto rounded-3xl border border-line bg-card p-4"
          >
            <p className="font-bold">📝 Notun (24 saat görünür)</p>
            <input
              value={govde}
              onChange={(e) => setGovde(e.target.value)}
              placeholder="Ne düşünüyorsun? (en fazla 60 karakter)"
              maxLength={60}
              className="w-full rounded-2xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand"
            />
            <p className="text-xs font-semibold text-muted">
              🎵 Şarkı ekle (sadece TR pop, isteğe bağlı)
            </p>
            <SarkiSecici
              deger={sarki}
              onChange={setSarki}
              sanatcilar={sanatcilar}
            />
            {hata && <p className="text-sm text-yellow-500">{hata}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              {benimNotum && (
                <button
                  type="button"
                  onClick={sil}
                  className="rounded-xl bg-card2 px-4 py-2 text-sm text-red-400"
                >
                  Notu sil
                </button>
              )}
              <button
                type="button"
                onClick={() => setDuzenleAcik(false)}
                className="rounded-xl bg-card2 px-4 py-2 text-sm"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={kaydediliyor}
                className="btn-brand rounded-xl px-5 py-2 text-sm font-semibold"
              >
                {kaydediliyor ? "..." : "Paylaş"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}