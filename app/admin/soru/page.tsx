"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../../lib/supabase";

type Soru = {
  id: string;
  question: string;
  is_active: boolean;
  created_at: string;
};

export default function AdminSoruSayfasi() {
  const supabase = createClient();

  const [yukleniyor, setYukleniyor] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [sorular, setSorular] = useState<Soru[]>([]);
  const [soru, setSoru] = useState("");
  const [hata, setHata] = useState("");
  const [basari, setBasari] = useState("");

  async function sorulariGetir() {
    const { data, error } = await supabase
      .from("daily_questions")
      .select("id, question, is_active, created_at")
      .order("created_at", { ascending: false });
    if (error) setHata(error.message);
    else setSorular(data || []);
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
      await sorulariGetir();
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function soruEkle(e: React.FormEvent) {
    e.preventDefault();
    setHata("");
    setBasari("");
    if (!soru.trim()) return;

    // Önce eski aktif soruları kapat, sonra yenisini ekle
    const { error: kapatmaHatasi } = await supabase
      .from("daily_questions")
      .update({ is_active: false })
      .eq("is_active", true);
    if (kapatmaHatasi) {
      setHata(kapatmaHatasi.message);
      return;
    }

    const { error } = await supabase
      .from("daily_questions")
      .insert({ question: soru.trim(), is_active: true });
    if (error) {
      setHata(error.message);
    } else {
      setBasari("Yeni soru yayında.");
      setSoru("");
      await sorulariGetir();
    }
  }

  async function aktifYap(s: Soru) {
    setHata("");
    setBasari("");
    const { error: kapatmaHatasi } = await supabase
      .from("daily_questions")
      .update({ is_active: false })
      .eq("is_active", true);
    if (kapatmaHatasi) {
      setHata(kapatmaHatasi.message);
      return;
    }
    const { error } = await supabase
      .from("daily_questions")
      .update({ is_active: true })
      .eq("id", s.id);
    if (error) setHata(error.message);
    else await sorulariGetir();
  }

  async function kapat(s: Soru) {
    setHata("");
    const { error } = await supabase
      .from("daily_questions")
      .update({ is_active: false })
      .eq("id", s.id);
    if (error) setHata(error.message);
    else await sorulariGetir();
  }

  async function soruSil(s: Soru) {
    if (!window.confirm("Bu soru ve tüm cevapları silinsin mi?")) return;
    setHata("");
    const { error } = await supabase
      .from("daily_questions")
      .delete()
      .eq("id", s.id);
    if (error) setHata(error.message);
    else await sorulariGetir();
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
        <h2 className="text-2xl font-extrabold">Günün sorusu</h2>
        <div className="flex gap-3 text-sm text-muted">
          <Link href="/admin/gruplar" className="hover:text-ink">
            Gruplar
          </Link>
          <Link href="/admin/anketler" className="hover:text-ink">
            Anketler
          </Link>
        </div>
      </div>

      <form
        onSubmit={soruEkle}
        className="space-y-3 rounded-2xl border border-line bg-card p-4"
      >
        <input
          value={soru}
          onChange={(e) => setSoru(e.target.value)}
          placeholder="Örn: Bugün hangi şarkıyı döngüye aldın?"
          maxLength={200}
          required
          className="w-full rounded-xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand"
        />
        <button
          type="submit"
          className="btn-brand w-full rounded-xl p-3 font-semibold"
        >
          Yeni soruyu yayınla
        </button>
        <p className="text-xs text-muted">
          Yeni soru yayınlanınca eskisi otomatik kapanır (cevapları durur).
        </p>
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
        <h3 className="text-sm text-muted">Sorular ({sorular.length})</h3>
        {sorular.length === 0 && (
          <p className="text-sm text-muted">Henüz soru yok.</p>
        )}
        {sorular.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-xl border border-line bg-card p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{s.question}</p>
              <p className="text-xs text-muted">
                {s.is_active ? "🟢 Yayında" : "Kapalı"} ·{" "}
                {new Date(s.created_at).toLocaleDateString("tr-TR")}
              </p>
            </div>
            {s.is_active ? (
              <button
                onClick={() => kapat(s)}
                className="text-sm text-muted hover:text-ink"
              >
                Kapat
              </button>
            ) : (
              <button
                onClick={() => aktifYap(s)}
                className="text-sm text-muted hover:text-ink"
              >
                Yayınla
              </button>
            )}
            <button
              onClick={() => soruSil(s)}
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