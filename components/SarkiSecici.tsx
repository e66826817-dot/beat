"use client";

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase";
import { youtubeId } from "../lib/youtube";

export type Sanatci = { id: string; name: string };
export type SarkiDegeri = { artistId: string; title: string; link: string };

export function useSanatcilar() {
  const supabase = createClient();
  const [liste, setListe] = useState<Sanatci[]>([]);
  useEffect(() => {
    supabase
      .from("tr_artists")
      .select("id, name")
      .order("name")
      .then(({ data }) => setListe(data || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return liste;
}

export default function SarkiSecici({
  deger,
  onChange,
  sanatcilar,
}: {
  deger: SarkiDegeri;
  onChange: (d: SarkiDegeri) => void;
  sanatcilar: Sanatci[];
}) {
  const alan =
    "w-full rounded-2xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand";
  const linkGecersiz = deger.link.trim() !== "" && !youtubeId(deger.link);

  return (
    <div className="space-y-2">
      <select
        value={deger.artistId}
        onChange={(e) => onChange({ ...deger, artistId: e.target.value })}
        className={alan}
      >
        <option value="">🎤 Sanatçı seç (TR pop)</option>
        {sanatcilar.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <input
        value={deger.title}
        onChange={(e) => onChange({ ...deger, title: e.target.value })}
        placeholder="Şarkı adı"
        maxLength={60}
        className={alan}
      />
      <input
        value={deger.link}
        onChange={(e) => onChange({ ...deger, link: e.target.value })}
        placeholder="YouTube bağlantısı (isteğe bağlı, çalmak için)"
        className={alan}
      />
      {linkGecersiz && (
        <p className="text-xs text-yellow-500">
          Geçerli bir YouTube bağlantısı değil.
        </p>
      )}
      <p className="text-xs text-muted">
        Sanatçı listesinde yoksa yöneticiden eklemesini isteyebilirsin.
      </p>
    </div>
  );
}