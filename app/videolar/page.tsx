"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { Avatar, hataCevir, useEngelliler } from "../../components/PostCard";
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
  video_reposts: { user_id: string }[];
};

type Yorum = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    equipped_frame: string | null;
  } | null;
};

const SORGU =
  "id, user_id, video_url, path, caption, created_at, profiles!videos_user_id_fkey(username, avatar_url, equipped_frame), video_likes(user_id), video_comments(id), video_reposts(user_id)";

const YORUM_SORGUSU =
  "id, user_id, content, created_at, profiles!video_comments_user_id_fkey(username, avatar_url, equipped_frame)";

const MAKS_BOYUT = 25 * 1024 * 1024;
const MAKS_SURE = 30;

function zaman(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });
}

function Yorumlar({
  videoId,
  uid,
  admin,
  gizli,
  onKapat,
  onDegisti,
}: {
  videoId: string;
  uid: string | null;
  admin: boolean;
  gizli: { has: (id: string) => boolean };
  onKapat: () => void;
  onDegisti: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [yorumlar, setYorumlar] = useState<Yorum[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [metin, setMetin] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState("");

  async function getir() {
    const { data, error } = await supabase
      .from("video_comments")
      .select(YORUM_SORGUSU)
      .eq("video_id", videoId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) setHata(hataCevir(error.message));
    else setYorumlar((data as unknown as Yorum[]) || []);
    setYukleniyor(false);
  }

  useEffect(() => {
    getir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    const temiz = metin.trim();
    if (!uid || !temiz || gonderiliyor) return;
    setHata("");
    setGonderiliyor(true);
    const { error } = await supabase
      .from("video_comments")
      .insert({ video_id: videoId, user_id: uid, content: temiz });
    if (error) setHata(hataCevir(error.message));
    else {
      setMetin("");
      await getir();
      onDegisti();
    }
    setGonderiliyor(false);
  }

  async function sil(y: Yorum) {
    if (!window.confirm("Bu yorum silinsin mi?")) return;
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
    onDegisti();
  }

  const gorunen = yorumlar.filter((y) => !gizli.has(y.user_id));

  return (
    <div className="absolute inset-x-0 bottom-0 top-1/4 z-20 flex flex-col rounded-t-3xl bg-card text-ink shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="font-bold">Yorumlar</h3>
        <button
          onClick={onKapat}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-card2 text-sm"
          aria-label="Kapat"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-2">
        {yukleniyor ? (
          <p className="py-6 text-center text-sm text-muted">Yükleniyor...</p>
        ) : gorunen.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            Henüz yorum yok. İlk yorumu sen yaz!
          </p>
        ) : (
          gorunen.map((y) => {
            const ad = y.profiles?.username ?? "bilinmiyor";
            return (
              <div key={y.id} className="flex gap-2">
                <Avatar
                  url={y.profiles?.avatar_url}
                  ad={ad}
                  boyut="h-8 w-8"
                  cerceve={y.profiles?.equipped_frame}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted">
                    <Link
                      href={`/profil/${ad}`}
                      className="font-semibold text-ink"
                    >
                      @{ad}
                    </Link>{" "}
                    · {zaman(y.created_at)}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {y.content}
                  </p>
                </div>
                {(admin || y.user_id === uid) && (
                  <button
                    onClick={() => sil(y)}
                    className="shrink-0 self-start text-xs text-red-400"
                    aria-label="Yorumu sil"
                  >
                    🗑
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {hata && (
        <p className="mx-4 mb-2 rounded-xl bg-card2 p-2 text-xs text-yellow-500">
          {hata}
        </p>
      )}

      {uid ? (
        <form
          onSubmit={gonder}
          className="flex gap-2 border-t border-line p-3"
        >
          <input
            value={metin}
            onChange={(e) => setMetin(e.target.value)}
            placeholder="Yorum yaz..."
            maxLength={300}
            className="min-w-0 flex-1 rounded-full bg-card2 px-4 py-2 text-sm text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand"
          />
          <button
            type="submit"
            disabled={!metin.trim() || gonderiliyor}
            className="btn-brand shrink-0 rounded-full px-4 py-2 text-sm font-semibold"
          >
            {gonderiliyor ? "..." : "Gönder"}
          </button>
        </form>
      ) : (
        <p className="border-t border-line p-3 text-center text-sm">
          <Link href="/giris" className="font-semibold text-brand">
            Yorum yapmak için giriş yap
          </Link>
        </p>
      )}
    </div>
  );
}

function Kart({
  v,
  uid,
  admin,
  sessiz,
  gizli,
  onSes,
  onBegen,
  onRepost,
  onSil,
  onYorum,
}: {
  v: Video;
  uid: string | null;
  admin: boolean;
  sessiz: boolean;
  gizli: { has: (id: string) => boolean };
  onSes: () => void;
  onBegen: (v: Video) => void;
  onRepost: (v: Video) => void;
  onSil: (v: Video) => void;
  onYorum: () => void;
}) {
  const kutu = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const gorunuyor = useRef(false);
  const elleDuraklatti = useRef(false);
  const [duraklat, setDuraklat] = useState(false);
  const [rapor, setRapor] = useState(false);
  const [yorumAcik, setYorumAcik] = useState(false);

  useEffect(() => {
    const el = kutu.current;
    const vd = video.current;
    if (!el || !vd) return;

    const gozlem = new IntersectionObserver(
      ([g]) => {
        gorunuyor.current = g.isIntersecting;
        if (g.isIntersecting) {
          elleDuraklatti.current = false;
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

    // Sekme/uygulama arka plana geçince ya da sayfa kapanınca sesi durdur
    const gorunurluk = () => {
      if (document.hidden) vd.pause();
      else if (gorunuyor.current && !elleDuraklatti.current) {
        vd.play().catch(() => {});
      }
    };
    const sayfaKapanirken = () => vd.pause();
    document.addEventListener("visibilitychange", gorunurluk);
    window.addEventListener("pagehide", sayfaKapanirken);

    return () => {
      gozlem.disconnect();
      document.removeEventListener("visibilitychange", gorunurluk);
      window.removeEventListener("pagehide", sayfaKapanirken);
      // Başka sayfaya geçilince video arkada çalmaya devam etmesin
      vd.pause();
    };
  }, []);

  useEffect(() => {
    if (video.current) video.current.muted = sessiz;
  }, [sessiz]);

  function dokun() {
    const vd = video.current;
    if (!vd) return;
    if (vd.paused) {
      elleDuraklatti.current = false;
      vd.play().catch(() => {});
      setDuraklat(false);
    } else {
      elleDuraklatti.current = true;
      vd.pause();
      setDuraklat(true);
    }
  }

  const ad = v.profiles?.username ?? "bilinmiyor";
  const begendi = v.video_likes.some((l) => l.user_id === uid);
  const repostladi = v.video_reposts.some((r) => r.user_id === uid);

  const dugme =
    "flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-xl";

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
          onClick={() => setYorumAcik(true)}
          className="flex flex-col items-center"
          aria-label="Yorumlar"
        >
          <span className={dugme}>💬</span>
          <span className="text-xs font-semibold">
            {v.video_comments.length}
          </span>
        </button>

        {uid && v.user_id !== uid && (
          <button
            onClick={() => onRepost(v)}
            className="flex flex-col items-center"
            aria-label="Repostla"
          >
            <span className={`${dugme} ${repostladi ? "text-brand" : ""}`}>
              🔁
            </span>
            <span className="text-xs font-semibold">
              {v.video_reposts.length}
            </span>
          </button>
        )}

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

      {yorumAcik && (
        <Yorumlar
          videoId={v.id}
          uid={uid}
          admin={admin}
          gizli={gizli}
          onKapat={() => setYorumAcik(false)}
          onDegisti={onYorum}
        />
      )}

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
  const gizli = useEngelliler(uid);

  async function getir() {
    const { data, error } = await supabase
      .from("videos")
      .select(SORGU)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) setHata(error.message);
    else
      setVideolar(
        ((data as unknown as Video[]) || []).map((v) => ({
          ...v,
          video_likes: v.video_likes ?? [],
          video_comments: v.video_comments ?? [],
          video_reposts: v.video_reposts ?? [],
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
        setAdmin(p?.role === "admin");
      }
      await getir();
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function repostla(v: Video) {
    if (!uid) {
      setHata("Repostlamak için giriş yapmalısın.");
      return;
    }
    setHata("");
    const repostladi = v.video_reposts.some((r) => r.user_id === uid);
    const { error } = repostladi
      ? await supabase
          .from("video_reposts")
          .delete()
          .eq("user_id", uid)
          .eq("video_id", v.id)
      : await supabase
          .from("video_reposts")
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
            yükleyebilirsin. Telifli içerik ve uygunsuz videolar kaldırılır.
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
                gizli={gizli}
                onSes={() => setSessiz(!sessiz)}
                onBegen={begen}
                onRepost={repostla}
                onSil={sil}
                onYorum={getir}
              />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}