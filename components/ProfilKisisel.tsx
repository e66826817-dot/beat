"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase";
import { hataCevir } from "./PostCard";
import SarkiSecici, { SarkiDegeri, useSanatcilar } from "./SarkiSecici";
import YoutubeOynatici from "./YoutubeOynatici";
import { youtubeId } from "../lib/youtube";

type Veri = {
  bias: string | null;
  fav_group_id: string | null;
  fav_song_title: string | null;
  fav_song_artist_id: string | null;
  song_video_id: string | null;
};

export default function ProfilKisisel({
  profilId,
  benimProfilim,
}: {
  profilId: string;
  benimProfilim: boolean;
}) {
  const supabase = createClient();
  const sanatcilar = useSanatcilar();
  const [veri, setVeri] = useState<Veri | null>(null);
  const [grupAdi, setGrupAdi] = useState<{ name: string; slug: string } | null>(
    null
  );
  const [sanatciAdi, setSanatciAdi] = useState<string | null>(null);
  const [gruplar, setGruplar] = useState<{ id: string; name: string }[]>([]);
  const [duzenle, setDuzenle] = useState(false);
  const [bias, setBias] = useState("");
  const [grupId, setGrupId] = useState("");
  const [sarki, setSarki] = useState<SarkiDegeri>({
    artistId: "",
    title: "",
    link: "",
  });
  const [hata, setHata] = useState("");
  const [kaydediliyor, setKaydediliyor] = useState(false);

  async function getir() {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "bias, fav_group_id, fav_song_title, fav_song_artist_id, song_video_id"
      )
      .eq("id", profilId)
      .maybeSingle();
    if (error) {
      setHata(error.message);
      return;
    }
    const v = (data as Veri) ?? null;
    setVeri(v);

    if (v?.fav_group_id) {
      const { data: g } = await supabase
        .from("groups")
        .select("name, slug")
        .eq("id", v.fav_group_id)
        .maybeSingle();
      setGrupAdi(g ?? null);
    } else {
      setGrupAdi(null);
    }

    if (v?.fav_song_artist_id) {
      const { data: s } = await supabase
        .from("tr_artists")
        .select("name")
        .eq("id", v.fav_song_artist_id)
        .maybeSingle();
      setSanatciAdi(s?.name ?? null);
    } else {
      setSanatciAdi(null);
    }
  }

  useEffect(() => {
    getir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profilId]);

  async function duzenlemeyiAc() {
    setBias(veri?.bias ?? "");
    setGrupId(veri?.fav_group_id ?? "");
    setSarki({
      artistId: veri?.fav_song_artist_id ?? "",
      title: veri?.fav_song_title ?? "",
      link: veri?.song_video_id ? `https://youtu.be/${veri.song_video_id}` : "",
    });
    setHata("");
    if (gruplar.length === 0) {
      const { data } = await supabase
        .from("groups")
        .select("id, name")
        .order("name");
      setGruplar(data || []);
    }
    setDuzenle(true);
  }

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    if (kaydediliyor) return;
    const baslik = sarki.title.trim();
    const videoId = youtubeId(sarki.link);
    if (sarki.link.trim() && !videoId) {
      setHata("Geçerli bir YouTube bağlantısı gir.");
      return;
    }
    if ((baslik || videoId) && !sarki.artistId) {
      setHata("Şarkı için bir sanatçı seç.");
      return;
    }
    if (videoId && !baslik) {
      setHata("Şarkının adını yaz.");
      return;
    }
    setHata("");
    setKaydediliyor(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        bias: bias.trim() || null,
        fav_group_id: grupId || null,
        fav_song_title: baslik || null,
        fav_song_artist_id: baslik ? sarki.artistId : null,
        song_video_id: videoId,
      })
      .eq("id", profilId);
    if (error) setHata(hataCevir(error.message));
    else {
      setDuzenle(false);
      await getir();
    }
    setKaydediliyor(false);
  }

  const bos =
    !veri?.bias &&
    !veri?.fav_group_id &&
    !veri?.fav_song_title &&
    !veri?.song_video_id;

  if (!benimProfilim && bos) return null;

  const alan =
    "w-full rounded-2xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand";

  if (duzenle) {
    return (
      <form
        onSubmit={kaydet}
        className="space-y-3 rounded-2xl border border-line bg-card2 p-3"
      >
        <p className="text-sm font-bold">✨ Kendini anlat</p>
        <input
          value={bias}
          onChange={(e) => setBias(e.target.value)}
          placeholder="Bias kim? (örn: Zeynep Bastık)"
          maxLength={40}
          className={alan}
        />
        <select
          value={grupId}
          onChange={(e) => setGrupId(e.target.value)}
          className={alan}
        >
          <option value="">🎤 Favori grup (isteğe bağlı)</option>
          {gruplar.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <p className="text-xs font-semibold text-muted">
          🎵 Favori / profil şarkın
        </p>
        <SarkiSecici deger={sarki} onChange={setSarki} sanatcilar={sanatcilar} />
        {hata && <p className="text-sm text-yellow-500">{hata}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDuzenle(false)}
            className="rounded-xl bg-card px-4 py-2 text-sm"
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
      </form>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl bg-card2 p-3 text-sm">
      {bos && benimProfilim && (
        <p className="text-muted">
          Bias, favori grup ve şarkı ekleyerek profilini özgünleştir.
        </p>
      )}
      {hata && <p className="text-xs text-yellow-500">{hata}</p>}
      {veri?.bias && (
        <p>
          ⭐ <span className="text-muted">Bias:</span> <b>{veri.bias}</b>
        </p>
      )}
      {grupAdi && (
        <p>
          🎤 <span className="text-muted">Favori grup:</span>{" "}
          <Link
            href={`/gruplar/${grupAdi.slug}`}
            className="font-bold text-brand hover:underline"
          >
            {grupAdi.name}
          </Link>
        </p>
      )}
      {veri?.fav_song_title && (
        <p>
          🎵 <span className="text-muted">Favori şarkı:</span>{" "}
          <b>
            {sanatciAdi ? `${sanatciAdi} – ` : ""}
            {veri.fav_song_title}
          </b>
        </p>
      )}
      {veri?.song_video_id && (
        <YoutubeOynatici
          videoId={veri.song_video_id}
          baslik={veri.fav_song_title ?? "Profil şarkısı"}
        />
      )}
      {benimProfilim && (
        <button
          onClick={duzenlemeyiAc}
          className="text-xs font-semibold text-brand hover:underline"
        >
          ✏️ {bos ? "Ekle" : "Düzenle"}
        </button>
      )}
    </div>
  );
}