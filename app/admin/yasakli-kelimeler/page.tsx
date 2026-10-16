"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../../lib/supabase";

export default function YasakliKelimeler() {
  const supabase = createClient();
  const [yukleniyor, setYukleniyor] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [kelimeler, setKelimeler] = useState<string[]>([]);
  const [yeni, setYeni] = useState("");
  const [hata, setHata] = useState("");

  async function getir() {
    const { data, error } = await supabase
      .from("blocked_words")
      .select("word")
      .order("word");
    if (error) setHata(error.message);
    else setKelimeler((data || []).map((x) => x.word));
  }

  useEffect(() => {
    async function baslat() {
      const { data: k } = await supabase.auth.getUser();
      if (k.user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", k.user.id)
          .single();
        const yetkili = p?.role === "admin";
        setAdmin(yetkili);
        if (yetkili) await getir();
      }
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ekle(e: React.FormEvent) {
    e.preventDefault();
    setHata("");
    const kelime = yeni.trim().toLowerCase();
    if (kelime.length < 2) {
      setHata("En az 2 karakter yaz.");
      return;
    }
    const { error } = await supabase.from("blocked_words").insert({ word: kelime });
    if (error) {
      setHata(error.code === "23505" ? "Bu ifade zaten listede." : error.message);
      return;
    }
    setYeni("");
    await getir();
  }

  async function sil(k: string) {
    setHata("");
    const { error } = await supabase.from("blocked_words").delete().eq("word", k);
    if (error) setHata(error.message);
    else await getir();
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <div className="h-32 animate-pulse rounded-3xl border border-line bg-card" />
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
      <Link href="/admin" className="text-sm text-muted hover:text-ink">
        ← Yönetim paneli
      </Link>
      <div>
        <h2 className="text-2xl font-extrabold">🚫 Yasaklı ifadeler</h2>
        <p className="text-sm text-muted">
          Gönderi, yorum, anket ve etkinliklerde bu ifadeyi içeren her şey
          reddedilir. İfade, kelimenin bir parçası olarak da eşleşir
          (&quot;kazan&quot; yazarsan &quot;kazanç&quot; da yakalanır), o yüzden
          kısa kelimelerde dikkatli ol.
        </p>
      </div>

      <form onSubmit={ekle} className="flex gap-2">
        <input
          value={yeni}
          onChange={(e) => setYeni(e.target.value)}
          placeholder="Yasaklanacak ifade"
          maxLength={40}
          className="min-w-0 flex-1 rounded-2xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand"
        />
        <button
          type="submit"
          disabled={yeni.trim().length < 2}
          className="btn-brand rounded-xl px-5 py-2 text-sm font-semibold"
        >
          Ekle
        </button>
      </form>

      {hata && <p className="text-sm text-yellow-500">{hata}</p>}

      <div className="flex flex-wrap gap-2">
        {kelimeler.length === 0 && (
          <p className="text-sm text-muted">Liste boş.</p>
        )}
        {kelimeler.map((k) => (
          <span
            key={k}
            className="inline-flex items-center gap-2 rounded-full bg-card2 px-3 py-1.5 text-sm"
          >
            {k}
            <button
              onClick={() => sil(k)}
              className="text-red-400 hover:text-red-300"
              aria-label="Sil"
            >
              ✕
            </button>
          </span>
        ))}
      </div>
    </main>
  );
}