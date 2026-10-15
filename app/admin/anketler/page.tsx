"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../../lib/supabase";

type Anket = {
  id: string;
  question: string;
  is_active: boolean;
  created_at: string;
};

export default function AdminAnketlerSayfasi() {
  const supabase = createClient();

  const [yukleniyor, setYukleniyor] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [anketler, setAnketler] = useState<Anket[]>([]);
  const [soru, setSoru] = useState("");
  const [secenekler, setSecenekler] = useState("");
  const [hata, setHata] = useState("");
  const [basari, setBasari] = useState("");

  async function anketleriGetir() {
    const { data, error } = await supabase
      .from("polls")
      .select("id, question, is_active, created_at")
      .order("created_at", { ascending: false });
    if (error) setHata(error.message);
    else setAnketler(data || []);
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
        setAdmin(profil?.role === "admin");
      }
      await anketleriGetir();
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function anketEkle(e: React.FormEvent) {
    e.preventDefault();
    setHata("");
    setBasari("");

    const liste = secenekler
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!soru.trim()) {
      setHata("Bir soru yaz.");
      return;
    }
    if (liste.length < 2 || liste.length > 8) {
      setHata("2 ile 8 arasında seçenek yaz (her satıra bir seçenek).");
      return;
    }

    const { data: anket, error } = await supabase
      .from("polls")
      .insert({ question: soru.trim() })
      .select("id")
      .single();

    if (error || !anket) {
      setHata(error?.message ?? "Anket oluşturulamadı.");
      return;
    }

    const { error: secenekHatasi } = await supabase.from("poll_options").insert(
      liste.map((label, i) => ({
        poll_id: anket.id,
        label,
        sort_order: i,
      }))
    );

    if (secenekHatasi) {
      await supabase.from("polls").delete().eq("id", anket.id);
      setHata(secenekHatasi.message);
      return;
    }

    setBasari("Anket oluşturuldu.");
    setSoru("");
    setSecenekler("");
    await anketleriGetir();
  }

  async function durumDegistir(a: Anket) {
    setHata("");
    setBasari("");
    const { error } = await supabase
      .from("polls")
      .update({ is_active: !a.is_active })
      .eq("id", a.id);
    if (error) setHata(error.message);
    else await anketleriGetir();
  }

  async function anketSil(a: Anket) {
    if (!window.confirm("Bu anket ve tüm oyları silinsin mi?")) return;
    setHata("");
    setBasari("");
    const { error } = await supabase.from("polls").delete().eq("id", a.id);
    if (error) setHata(error.message);
    else await anketleriGetir();
  }

  const alan =
    "w-full rounded-xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand";

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
        <h2 className="text-2xl font-extrabold">Anket yönetimi</h2>
        <div className="flex gap-3 text-sm text-muted">
          <Link href="/admin/gruplar" className="hover:text-ink">
            Gruplar
          </Link>
          <Link href="/admin/uyeler" className="hover:text-ink">
            Üyeler
          </Link>
        </div>
      </div>

      <form
        onSubmit={anketEkle}
        className="space-y-3 rounded-2xl border border-line bg-card p-4"
      >
        <input
          value={soru}
          onChange={(e) => setSoru(e.target.value)}
          placeholder="Anket sorusu (örn: Ayın grubu hangisi olsun?)"
          maxLength={200}
          required
          className={alan}
        />
        <textarea
          value={secenekler}
          onChange={(e) => setSecenekler(e.target.value)}
          placeholder={"Seçenekler (her satıra bir tane)\nSeçenek 1\nSeçenek 2"}
          rows={5}
          className={`${alan} resize-none`}
        />
        <button
          type="submit"
          className="btn-brand w-full rounded-xl p-3 font-semibold"
        >
          Anketi oluştur
        </button>
      </form>

      {hata && (
        <p className="rounded-xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}
      {basari && (
        <p className="rounded-xl border border-line bg-card p-3 text-sm text-green-500">
          {basari}
        </p>
      )}

      <div className="space-y-2">
        <h3 className="text-sm text-muted">Anketler ({anketler.length})</h3>
        {anketler.length === 0 && (
          <p className="text-sm text-muted">Henüz anket yok.</p>
        )}
        {anketler.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-3 rounded-xl border border-line bg-card p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{a.question}</p>
              <p className="text-xs text-muted">
                {a.is_active ? "Açık" : "Kapalı"} ·{" "}
                {new Date(a.created_at).toLocaleDateString("tr-TR")}
              </p>
            </div>
            <button
              onClick={() => durumDegistir(a)}
              className="text-sm text-muted hover:text-ink"
            >
              {a.is_active ? "Kapat" : "Aç"}
            </button>
            <button
              onClick={() => anketSil(a)}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Sil
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}