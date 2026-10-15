"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase";

type Props = {
  hedefTuru: "post" | "comment" | "user";
  hedefId: string;
  kullaniciId: string;
  onKapat: () => void;
};

const SEBEPLER = [
  { id: "spam", etiket: "Spam / reklam" },
  { id: "taciz", etiket: "Taciz / zorbalık" },
  { id: "uygunsuz", etiket: "Uygunsuz içerik" },
  { id: "diger", etiket: "Diğer" },
] as const;

export default function SikayetFormu({
  hedefTuru,
  hedefId,
  kullaniciId,
  onKapat,
}: Props) {
  const supabase = createClient();
  const [sebep, setSebep] = useState<string>("spam");
  const [detay, setDetay] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState("");
  const [bitti, setBitti] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    if (gonderiliyor) return;
    setHata("");
    setGonderiliyor(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: kullaniciId,
      target_type: hedefTuru,
      target_id: hedefId,
      reason: sebep,
      details: detay.trim() || null,
    });
    if (error) {
      setHata(
        error.code === "23505"
          ? "Bunu zaten şikayet ettin."
          : error.message
      );
    } else {
      setBitti(true);
    }
    setGonderiliyor(false);
  }

  if (bitti) {
    return (
      <div className="mt-3 rounded-xl border border-line bg-card2 p-3 text-sm">
        <p>✓ Şikayetin alındı, teşekkürler. Ekibimiz inceleyecek.</p>
        <button
          onClick={onKapat}
          className="mt-2 text-xs font-semibold text-brand hover:underline"
        >
          Kapat
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={gonder}
      className="mt-3 space-y-2 rounded-xl border border-line bg-card2 p-3"
    >
      <p className="text-xs font-semibold text-muted">⚑ Şikayet sebebi</p>
      <div className="flex flex-wrap gap-2">
        {SEBEPLER.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSebep(s.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              sebep === s.id ? "btn-brand" : "bg-card text-muted hover:text-ink"
            }`}
          >
            {s.etiket}
          </button>
        ))}
      </div>
      <textarea
        value={detay}
        onChange={(e) => setDetay(e.target.value)}
        placeholder="Açıklama (isteğe bağlı)"
        maxLength={300}
        rows={2}
        className="w-full resize-none rounded-lg bg-card p-2.5 text-sm text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand"
      />
      {hata && <p className="text-sm text-yellow-500">{hata}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onKapat}
          className="rounded-lg bg-card px-4 py-2 text-sm hover:opacity-80"
        >
          Vazgeç
        </button>
        <button
          type="submit"
          disabled={gonderiliyor}
          className="btn-brand rounded-lg px-5 py-2 text-sm font-semibold"
        >
          {gonderiliyor ? "Gönderiliyor..." : "Şikayet et"}
        </button>
      </div>
    </form>
  );
}