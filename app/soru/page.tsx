"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import PostCard, {
  Avatar,
  Gonderi,
  GONDERI_SORGUSU,
  gonderiDuzenle,
  hataCevir,
} from "../../components/PostCard";

type Soru = { id: string; question: string; created_at: string };

export default function SoruSayfasi() {
  const supabase = createClient();

  const [soru, setSoru] = useState<Soru | null>(null);
  const [cevaplar, setCevaplar] = useState<Gonderi[]>([]);
  const [kullaniciId, setKullaniciId] = useState<string | null>(null);
  const [kullaniciAdi, setKullaniciAdi] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [metin, setMetin] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");

  async function cevaplariGetir(soruId: string) {
    const { data, error } = await supabase
      .from("posts")
      .select(GONDERI_SORGUSU)
      .eq("question_id", soruId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) setHata(error.message);
    else
      setCevaplar(((data as unknown as Gonderi[]) || []).map(gonderiDuzenle));
  }

  useEffect(() => {
    async function baslat() {
      const { data: kullanici } = await supabase.auth.getUser();
      if (kullanici.user) {
        setKullaniciId(kullanici.user.id);
        const { data: profil } = await supabase
          .from("profiles")
          .select("username, avatar_url, role")
          .eq("id", kullanici.user.id)
          .single();
        if (profil) {
          setKullaniciAdi(profil.username);
          setAvatarUrl(profil.avatar_url);
          setAdmin(profil.role === "admin");
        }
      }

      const { data: s } = await supabase
        .from("daily_questions")
        .select("id, question, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (s) {
        setSoru(s);
        await cevaplariGetir(s.id);
      }
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cevapla(e: React.FormEvent) {
    e.preventDefault();
    if (!soru || !kullaniciId || !metin.trim() || gonderiliyor) return;
    setHata("");
    setGonderiliyor(true);
    const { error } = await supabase.from("posts").insert({
      user_id: kullaniciId,
      question_id: soru.id,
      content: metin.trim(),
    });
    if (error) {
      setHata(
        error.code === "23505"
          ? "Bu soruya zaten cevap verdin."
          : hataCevir(error.message)
      );
      await cevaplariGetir(soru.id);
    } else {
      setMetin("");
      await cevaplariGetir(soru.id);
    }
    setGonderiliyor(false);
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 p-4">
        <div className="h-40 animate-pulse rounded-3xl border border-line bg-card" />
        <div className="h-24 animate-pulse rounded-3xl border border-line bg-card" />
      </main>
    );
  }

  const benimCevabim = cevaplar.find((c) => c.user_id === kullaniciId);

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <Link href="/" className="text-sm text-muted hover:text-ink">
        ← Ana sayfa
      </Link>

      {!soru ? (
        <div className="rounded-3xl border border-dashed border-line py-12 text-center text-muted">
          <p className="text-4xl">💭</p>
          <p className="mt-2 px-4">Bugün için henüz bir soru yok. Yakında!</p>
          {admin && (
            <Link
              href="/admin/soru"
              className="mt-3 inline-block text-brand hover:underline"
            >
              Soru ekle
            </Link>
          )}
        </div>
      ) : (
        <>
          <section className="btn-brand rounded-3xl p-6">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-90">
              💭 Günün sorusu
            </p>
            <h2 className="mt-1 text-2xl font-extrabold">{soru.question}</h2>
            <p className="mt-2 text-sm opacity-90">{cevaplar.length} cevap</p>
          </section>

          {!kullaniciId ? (
            <p className="rounded-2xl border border-line bg-card p-3 text-sm text-muted">
              Cevap yazmak için{" "}
              <Link href="/giris" className="text-brand hover:underline">
                giriş yap
              </Link>
              .
            </p>
          ) : benimCevabim ? (
            <p className="rounded-2xl border border-line bg-card p-3 text-sm text-muted">
              ✓ Bu soruya cevap verdin. Her soruya bir cevap hakkın var; cevabını
              kartın ⋯ menüsünden düzenleyebilir ya da silip yeniden
              yazabilirsin.
            </p>
          ) : (
            <form
              onSubmit={cevapla}
              className="space-y-3 rounded-3xl border border-line bg-card p-4"
            >
              <div className="flex gap-3">
                <Avatar url={avatarUrl} ad={kullaniciAdi || "?"} />
                <textarea
                  value={metin}
                  onChange={(e) => setMetin(e.target.value)}
                  placeholder="Cevabını yaz (tek hakkın var)..."
                  maxLength={300}
                  rows={3}
                  className="min-w-0 flex-1 resize-none rounded-2xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <span className="text-xs text-muted">{metin.length}/300</span>
                <button
                  type="submit"
                  disabled={!metin.trim() || gonderiliyor}
                  className="btn-brand rounded-xl px-5 py-2 text-sm font-semibold"
                >
                  {gonderiliyor ? "Gönderiliyor..." : "Cevapla"}
                </button>
              </div>
            </form>
          )}

          {hata && (
            <p className="rounded-2xl border border-line bg-card p-3 text-sm text-yellow-500">
              {hata}
            </p>
          )}

          <div className="space-y-3">
            {cevaplar.length === 0 && (
              <div className="rounded-3xl border border-dashed border-line py-10 text-center text-muted">
                <p className="text-4xl">🎶</p>
                <p className="mt-2">İlk cevabı sen yaz!</p>
              </div>
            )}
            {cevaplar.map((g) => (
              <PostCard
                key={g.id}
                gonderi={g}
                kullaniciId={kullaniciId}
                admin={admin}
                onYenile={() => cevaplariGetir(soru.id)}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}