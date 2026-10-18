"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase";
import { Avatar, hataCevir, useEngelliler, zamanOnce } from "../../components/PostCard";
import SikayetFormu from "../../components/SikayetFormu";

type Video = {
  id: string;
  user_id: string;
  video_url: string;
  path: string;
  caption: string | null;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    equipped_frame: string | null;
  } | null;
  video_likes: { user_id: string }[];
  video_comments: { id: string }[];
};

type Yorum = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    equipped_frame: string | null;
  } | null;
};

const SORGU =
  "id, user_id, video_url, path, caption, created_at, profiles!videos_user_id_fkey(username, avatar_url, equipped_frame), video_likes(user_id), video_comments(id)";

const MAKS_BOYUT = 25 * 1024 * 1024;
const MAKS_SURE = 30;

function duzenle(v: Video): Video {
  return {
    ...v,
    video_likes: v.video_likes ?? [],
    video_comments: v.video_comments ?? [],
  };
}

function YorumPaneli({
  video,
  uid,
  admin,
  onKapat,
  onDegisti,
}: {
  video: Video;
  uid: string | null;
  admin: boolean;
  onKapat: () => void;
  onDegisti: () => void | Promise<void>;
}) {
  const supabase = createClient();
  const [yorumlar, setYorumlar] = useState<Yorum[]>([]);
  const [metin, setMetin] = useState("");
  const [hata, setHata] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function getir() {
    const { data, error } = await supabase
      .from("video_comments")
      .select(
        "id, user_id, body, created_at, profiles!video_comments_user_id_fkey(username, avatar_url, equipped_frame)"
      )
      .eq("video_id", video.id)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) setHata(error.message);
    else setYorumlar((data as unknown as Yorum[]) || []);
  }

  useEffect(() => {
    getir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id]);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    if (!uid || !metin.trim() || gonderiliyor) return;
    setHata("");
    setGonderiliyor(true);
    const { error } = await supabase
      .from("video_comments")
      .insert({ video_id: video.id, user_id: uid, body: metin.trim() });
    if (error) setHata(hataCevir(error.message));
    else {
      setMetin("");
      await getir();
      await onDegisti();
    }
    setGonderiliyor(false);
  }

  async function sil(y: Yorum) {
    setHata("");
    const { data, error } = await supabase
      .from("video_comments")
      .delete()
      .eq("id", y.id)
      .select("id");
    if (error || !data || data.length === 0) {
      setHata(hataCevir(error?.message ?? "Yorum silinemedi."));
      return;
    }
    await getir();
    await onDegisti();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onKapat}>
      <div
        className="mx-auto flex max-h-[75dvh] w-full max-w-md flex-col rounded-t-3xl border border-line bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line p-4">
          <p className="font-bold">💬 Yorumlar ({yorumlar.length})</p>
          <button onClick={onKapat} className="text-xl text-muted" aria-label="Kapat">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {yorumlar.length === 0 && (
            <p className="text-center text-sm text-muted">
              Henüz yorum yok. İlk yorumu sen yaz!
            </p>
          )}
          {yorumlar.map((y) => {
            const ad = y.profiles?.username ?? "bilinmiyor";
            const silebilir = admin || y.user_id === uid || video.user_id === uid;
            return (
              <div key={y.id} className="flex gap-2">
                <Avatar
                  url={y.profiles?.avatar_url}
                  ad={ad}
                  boyut="h-8 w-8"
                  cerceve={y.profiles?.equipped_frame}
                />
                <div className="min-w-0 flex-1 rounded-2xl bg-card2 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/profil/${ad}`}
                      className="font-semibold hover:text-brand"
                    >
                      @{ad}
                    </Link>
                    <span className="text-xs text-muted">
                      {zamanOnce(y.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{y.body}</p>
                  {silebilir && (
                    <button
                      onClick={() => sil(y)}
                      className="mt-1 text-xs font-semibold text-red-400"
                    >
                      Sil
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {hata && <p className="px-4 text-sm text-yellow-500">{hata}</p>}

        {uid ? (
          <form onSubmit={gonder} className="flex gap-2 border-t border-line p-3">
            <input
              value={metin}
              onChange={(e) => setMetin(e.target.value)}
              placeholder="Yorum yaz..."
              maxLength={200}
              className="min-w-0 flex-1 rounded-2xl bg-card2 p-3 text-sm text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand"
            />
            <button
              type="submit"
              disabled={!metin.trim() || gonderiliyor}
              className="btn-brand rounded-2xl px-4 py-2 text-sm font-semibold"
            >
              Gönder
            </button>
          </form>
        ) : (
          <p className="border-t border-line p-3 text-center text-sm text-muted">
            Yorum yazmak için{" "}
            <Link href="/giris" className="text-brand">
              giriş yap
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}

function Kart({
  v,
  uid,
  admin,
  sessiz,
  onSes,
  onBegen,
  onYorum,
  onSil,
}: {
  v: Video;
  uid: string | null;
  admin: boolean;
  sessiz: boolean;
  onSes: () => void;
  onBegen: (v: Video) => void;
  onYorum: (v: Video) => void;
  onSil: (v: Video) => void;
}) {
  const kutu = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [duraklat, setDuraklat] = useState(false);
  const [rapor, setRapor] = useState(false);

  useEffect(() => {
    const el = kutu.current;
    if (!el) return;
    const gozlem = new IntersectionObserver(
      ([g]) => {
        const vd = video.current;
        if (!vd) return;
        if (g.isIntersecting) {
          vd.play().catch(() => {});
          setDuraklat(false);
        } else {
          vd.pause();
          vd.currentTime = 0;
        }
      },
      { threshold: 0.7 }
    );
    gozlem.observe(el);
    return () => gozlem.disconnect();
  }, []);

  useEffect(() => {
    if (video.current) video.current.muted = sessiz;
  }, [sessiz]);

  function dokun() {
    const vd = video.current;
    if (!vd) return;
    if (vd.paused) {
      vd.play().catch(() => {});
      setDuraklat(false);
    } else {
      vd.pause();
      setDuraklat(true);
    }
  }

  const ad = v.profiles?.username ?? "bilinmiyor";
  const begendi = v.video_likes.some((l) => l.user_id === uid);
  const dugme =
    "flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-xl";

  return (
    <div
      ref={kutu}
      className="relative h-full w-full snap-start snap-always overflow-hidden bg-black"
    >
      <video
        ref={video}
        src={v.video_url}
        loop
        playsInline
        muted={sessiz}
        preload="metadata"
        onClick={dokun}
        className="h-full w-full object-contain"
      />

      {duraklat && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-black/50 px-5 py-3 text-4xl text-white">
            ▶
          </span>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pr-20 text-white">
        <Link
          href={`/profil/${ad}`}
          className="flex items-center gap-2 font-semibold"
        >
          <Avatar
            url={v.profiles?.avatar_url}
            ad={ad}
            boyut="h-9 w-9"
            cerceve={v.profiles?.equipped_frame}
          />
          @{ad}
        </Link>
        {v.caption && (
          <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm">
            {v.caption}
          </p>
        )}
      </div>

      <div className="absolute bottom-6 right-3 flex flex-col items-center gap-3 text-white">
        <button
          onClick={() => onBegen(v)}
          className="flex flex-col items-center"
          aria-label="Beğen"
        >
          <span className={`${dugme} text-2xl ${begendi ? "text-brand" : ""}`}>
            {begendi ? "♥" : "♡"}
          </span>
          <span className="text-xs font-semibold">{v.video_likes.length}</span>
        </button>
        <button
          onClick={() => onYorum(v)}
          className="flex flex-col items-center"
          aria-label="Yorumlar"
        >
          <span className={dugme}>💬</span>
          <span className="text-xs font-semibold">{v.video_comments.length}</span>
        </button>
        <button onClick={onSes} className={dugme} aria-label="Ses">
          {sessiz ? "🔇" : "🔊"}
        </button>
        {uid && v.user_id !== uid && (
          <button
            onClick={() => setRapor(true)}
            className={dugme}
            aria-label="Şikayet et"
          >
            ⚑
          </button>
        )}
        {(admin || v.user_id === uid) && (
          <button
            onClick={() => onSil(v)}
            className={`${dugme} text-red-400`}
            aria-label="Sil"
          >
            🗑
          </button>
        )}
      </div>

      {rapor && uid && (
        <div className="absolute inset-x-3 top-3 rounded-2xl bg-card p-2 text-ink">
          <SikayetFormu
            hedefTuru="video"
            hedefId={v.id}
            kullaniciId={uid}
            onKapat={() => setRapor(false)}
          />
        </div>
      )}
    </div>
  );
}

export default function VideolarSayfasi() {
  const supabase = createClient();
  const arama = useSearchParams();
  const hedef = arama.get("v");
  const [videolar, setVideolar] = useState<Video[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");
  const [sessiz, setSessiz] = useState(true);
  const [formAcik, setFormAcik] = useState(false);
  const [dosya, setDosya] = useState<File | null>(null);
  const [sure, setSure] = useState(0);
  const [aciklama, setAciklama] = useState("");
  const [yukleme, setYukleme] = useState(false);
  const [yorumVideo, setYorumVideo] = useState<string | null>(null);
  const gizli = useEngelliler(uid);

  async function getir() {
    const { data, error } = await supabase
      .from("videos")
      .select(SORGU)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) {
      setHata(error.message);
      return;
    }
    let liste = ((data as unknown as Video[]) || []).map(duzenle);

    // Bildirimden gelen video listede yoksa ayrıca getir
    if (hedef && !liste.some((v) => v.id === hedef)) {
      const { data: tek } = await supabase
        .from("videos")
        .select(SORGU)
        .eq("id", hedef)
        .maybeSingle();
      if (tek) liste = [duzenle(tek as unknown as Video), ...liste];
    }
    setVideolar(liste);
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
      await getir();
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hedef]);

  function dosyaSec(f: File | null) {
    setHata("");
    setDosya(null);
    setSure(0);
    if (!f) return;
    if (f.size > MAKS_BOYUT) {
      setHata("Video en fazla 25 MB olabilir.");
      return;
    }
    const url = URL.createObjectURL(f);
    const vd = document.createElement("video");
    vd.preload = "metadata";
    vd.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (vd.duration > MAKS_SURE + 0.5) {
        setHata(`Video en fazla ${MAKS_SURE} saniye olabilir.`);
        return;
      }
      setSure(Math.max(1, vd.duration));
      setDosya(f);
    };
    vd.onerror = () => {
      URL.revokeObjectURL(url);
      setHata("Bu video dosyası okunamadı. MP4 (H.264) dene.");
    };
    vd.src = url;
  }

  async function yukle(e: React.FormEvent) {
    e.preventDefault();
    if (!dosya || !uid || yukleme) return;
    setHata("");
    setYukleme(true);
    const uzanti = dosya.name.split(".").pop()?.toLowerCase() || "mp4";
    const yol = `${uid}/${Date.now()}.${uzanti}`;
    const { error: yuklemeHatasi } = await supabase.storage
      .from("videos")
      .upload(yol, dosya, { contentType: dosya.type });
    if (yuklemeHatasi) {
      setHata(hataCevir(yuklemeHatasi.message));
      setYukleme(false);
      return;
    }
    const url = supabase.storage.from("videos").getPublicUrl(yol).data.publicUrl;
    const { error } = await supabase.from("videos").insert({
      user_id: uid,
      video_url: url,
      path: yol,
      caption: aciklama.trim() || null,
      duration_sec: sure,
    });
    if (error) {
      await supabase.storage.from("videos").remove([yol]);
      setHata(hataCevir(error.message));
    } else {
      setDosya(null);
      setAciklama("");
      setFormAcik(false);
      await getir();
    }
    setYukleme(false);
  }

  async function begen(v: Video) {
    if (!uid) {
      setHata("Beğenmek için giriş yapmalısın.");
      return;
    }
    setHata("");
    const begendi = v.video_likes.some((l) => l.user_id === uid);
    const { error } = begendi
      ? await supabase
          .from("video_likes")
          .delete()
          .eq("user_id", uid)
          .eq("video_id", v.id)
      : await supabase
          .from("video_likes")
          .insert({ user_id: uid, video_id: v.id });
    if (error) setHata(hataCevir(error.message));
    else await getir();
  }

  async function sil(v: Video) {
    if (!window.confirm("Bu video silinsin mi?")) return;
    setHata("");
    const { data, error } = await supabase
      .from("videos")
      .delete()
      .eq("id", v.id)
      .select("id");
    if (error || !data || data.length === 0) {
      setHata(hataCevir(error?.message ?? "Video silinemedi."));
      return;
    }
    await supabase.storage.from("videos").remove([v.path]);
    await getir();
  }

  const liste = videolar.filter((v) => !gizli.has(v.user_id));
  const acikVideo = liste.find((v) => v.id === yorumVideo) ?? null;

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-md p-4">
        <div className="h-96 animate-pulse rounded-3xl border border-line bg-card" />
      </main>
    );
  }

  const alan =
    "w-full rounded-2xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand";

  return (
    <main className="mx-auto max-w-md space-y-3 p-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold">🎬 Videolar</h2>
        {uid ? (
          <button
            onClick={() => setFormAcik(!formAcik)}
            className="btn-brand rounded-xl px-4 py-2 text-sm font-semibold"
          >
            {formAcik ? "Vazgeç" : "+ Video yükle"}
          </button>
        ) : (
          <Link href="/giris" className="text-sm font-semibold text-brand">
            Yüklemek için giriş yap
          </Link>
        )}
      </div>

      {formAcik && (
        <form
          onSubmit={yukle}
          className="space-y-3 rounded-3xl border border-line bg-card p-4"
        >
          <label className="block cursor-pointer rounded-2xl bg-card2 px-3 py-3 text-sm text-muted hover:text-ink">
            🎥{" "}
            {dosya
              ? `${dosya.name.slice(0, 24)} · ${Math.round(sure)} sn`
              : "Video seç (en fazla 30 sn, 25 MB, MP4 önerilir)"}
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(e) => dosyaSec(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
          <textarea
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            placeholder="Açıklama (isteğe bağlı)"
            maxLength={150}
            rows={2}
            className={`${alan} resize-none`}
          />
          <p className="text-xs text-muted">
            Hesabın en az 1 günlük olmalı. Günde en fazla 5 video
            yükleyebilirsin. Yalnızca paylaşma hakkın olan videoları yükle.
          </p>
          <button
            type="submit"
            disabled={!dosya || yukleme}
            className="btn-brand w-full rounded-xl p-3 font-semibold"
          >
            {yukleme ? "Yükleniyor, bekle..." : "Yayınla"}
          </button>
        </form>
      )}

      {hata && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}

      {liste.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line py-16 text-center text-muted">
          <p className="text-4xl">🎬</p>
          <p className="mt-2">Henüz video yok. İlk videoyu sen yükle!</p>
        </div>
      ) : (
        <div
          className="snap-y snap-mandatory overflow-y-scroll rounded-3xl border border-line bg-black"
          style={{ height: "calc(100dvh - 12rem)", overscrollBehavior: "contain" }}
        >
          {liste.map((v) => (
            <div key={v.id} className="h-full w-full">
              <Kart
                v={v}
                uid={uid}
                admin={admin}
                sessiz={sessiz}
                onSes={() => setSessiz(!sessiz)}
                onBegen={begen}
                onYorum={(x) => setYorumVideo(x.id)}
                onSil={sil}
              />
            </div>
          ))}
        </div>
      )}

      {acikVideo && (
        <YorumPaneli
          video={acikVideo}
          uid={uid}
          admin={admin}
          onKapat={() => setYorumVideo(null)}
          onDegisti={getir}
        />
      )}
    </main>
  );
}