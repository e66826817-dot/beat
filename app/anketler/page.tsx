"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { hataCevir } from "../../components/PostCard";

type Secenek = { id: string; label: string; sort_order: number };
type Oy = { user_id: string; option_id: string };
type Anket = {
  id: string;
  question: string;
  is_active: boolean;
  created_at: string;
  creator_id: string | null;
  profiles: { username: string } | null;
  poll_options: Secenek[];
  poll_votes: Oy[];
};

export default function AnketlerSayfasi() {
  const supabase = createClient();
  const [anketler, setAnketler] = useState<Anket[]>([]);
  const [kullaniciId, setKullaniciId] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");
  const [basari, setBasari] = useState("");

  const [formAcik, setFormAcik] = useState(false);
  const [soru, setSoru] = useState("");
  const [secenekler, setSecenekler] = useState("");
  const [olusturuluyor, setOlusturuluyor] = useState(false);

  async function anketleriGetir() {
    const { data, error } = await supabase
      .from("polls")
      .select(
        "id, question, is_active, created_at, creator_id, profiles!polls_creator_id_fkey(username), poll_options!poll_options_poll_id_fkey(id, label, sort_order), poll_votes!poll_votes_poll_id_fkey(user_id, option_id)"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setHata(error.message);
    } else {
      setAnketler(
        ((data as unknown as Anket[]) || []).map((a) => ({
          ...a,
          poll_options: (a.poll_options ?? []).sort(
            (x, y) => x.sort_order - y.sort_order
          ),
          poll_votes: a.poll_votes ?? [],
        }))
      );
    }
  }

  useEffect(() => {
    async function baslat() {
      const { data } = await supabase.auth.getUser();
      setKullaniciId(data.user?.id ?? null);
      if (data.user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        setAdmin(p?.role === "admin");
      }
      await anketleriGetir();
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function oyVer(anket: Anket, secenekId: string) {
    if (!kullaniciId) {
      setHata("Oy vermek için giriş yapmalısın.");
      return;
    }
    setHata("");
    setBasari("");
    const { error } = await supabase.from("poll_votes").insert({
      poll_id: anket.id,
      user_id: kullaniciId,
      option_id: secenekId,
    });
    if (error) {
      setHata(
        error.message.includes("duplicate")
          ? "Bu ankete zaten oy verdin."
          : hataCevir(error.message)
      );
    }
    await anketleriGetir();
  }

  async function anketOlustur(e: React.FormEvent) {
    e.preventDefault();
    if (!kullaniciId || olusturuluyor) return;
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

    setOlusturuluyor(true);
    const { data: anket, error } = await supabase
      .from("polls")
      .insert({ question: soru.trim(), creator_id: kullaniciId })
      .select("id")
      .single();

    if (error || !anket) {
      setHata(hataCevir(error?.message ?? "Anket oluşturulamadı."));
      setOlusturuluyor(false);
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
      setHata(hataCevir(secenekHatasi.message));
      setOlusturuluyor(false);
      return;
    }

    setBasari("Anket yayında!");
    setSoru("");
    setSecenekler("");
    setFormAcik(false);
    await anketleriGetir();
    setOlusturuluyor(false);
  }

  async function durumDegistir(a: Anket) {
    setHata("");
    const { error } = await supabase
      .from("polls")
      .update({ is_active: !a.is_active })
      .eq("id", a.id);
    if (error) setHata(hataCevir(error.message));
    else await anketleriGetir();
  }

  async function anketSil(a: Anket) {
    if (!window.confirm("Bu anket ve tüm oyları silinsin mi?")) return;
    setHata("");
    const { data, error } = await supabase
      .from("polls")
      .delete()
      .eq("id", a.id)
      .select("id");
    if (error || !data || data.length === 0) {
      setHata(hataCevir(error?.message ?? "Anket silinemedi."));
      return;
    }
    await anketleriGetir();
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 p-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-3xl border border-line bg-card"
          />
        ))}
      </main>
    );
  }

  const alan =
    "w-full rounded-2xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand";

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold">Anketler</h2>
          <p className="text-sm text-muted">Oyunu kullan ya da kendi anketini aç.</p>
        </div>
        {kullaniciId && (
          <button
            onClick={() => setFormAcik(!formAcik)}
            className="btn-brand shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            {formAcik ? "Vazgeç" : "+ Anket aç"}
          </button>
        )}
      </div>

      {!kullaniciId && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-muted">
          Oy vermek ve anket açmak için{" "}
          <Link href="/giris" className="text-brand hover:underline">
            giriş yap
          </Link>
          .
        </p>
      )}

      {formAcik && (
        <form
          onSubmit={anketOlustur}
          className="space-y-3 rounded-3xl border border-line bg-card p-4"
        >
          <input
            value={soru}
            onChange={(e) => setSoru(e.target.value)}
            placeholder="Anket sorusu (örn: En iyi comeback hangisiydi?)"
            maxLength={200}
            required
            className={alan}
          />
          <textarea
            value={secenekler}
            onChange={(e) => setSecenekler(e.target.value)}
            placeholder={"Seçenekler (her satıra bir tane, 2-8 arası)\nSeçenek 1\nSeçenek 2"}
            rows={5}
            className={`${alan} resize-none`}
          />
          <p className="text-xs text-muted">Günde en fazla 3 anket açabilirsin.</p>
          <button
            type="submit"
            disabled={olusturuluyor}
            className="btn-brand w-full rounded-xl p-3 font-semibold"
          >
            {olusturuluyor ? "Oluşturuluyor..." : "Anketi yayınla"}
          </button>
        </form>
      )}

      {hata && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}
      {basari && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-green-500">
          {basari}
        </p>
      )}

      {anketler.length === 0 && !hata && (
        <div className="rounded-3xl border border-dashed border-line py-12 text-center text-muted">
          <p className="text-4xl">📊</p>
          <p className="mt-2">Henüz anket yok. İlk anketi sen aç!</p>
        </div>
      )}

      {anketler.map((a) => {
        const toplam = a.poll_votes.length;
        const benimOyum = a.poll_votes.find((o) => o.user_id === kullaniciId);
        const sonuclariGoster = !!benimOyum || !a.is_active;
        const yonetebilir = admin || (!!kullaniciId && a.creator_id === kullaniciId);

        return (
          <section
            key={a.id}
            className="space-y-3 rounded-3xl border border-line bg-card p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-bold">{a.question}</h3>
                {a.profiles?.username && (
                  <p className="text-xs text-muted">
                    <Link
                      href={`/profil/${a.profiles.username}`}
                      className="hover:text-brand"
                    >
                      @{a.profiles.username}
                    </Link>{" "}
                    açtı
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full bg-card2 px-3 py-1 text-xs font-semibold ${
                  a.is_active ? "text-brand" : "text-muted"
                }`}
              >
                {a.is_active ? "Açık" : "Kapandı"}
              </span>
            </div>

            <div className="space-y-2">
              {a.poll_options.map((s) => {
                const sayi = a.poll_votes.filter(
                  (o) => o.option_id === s.id
                ).length;
                const yuzde = toplam ? Math.round((sayi / toplam) * 100) : 0;
                const secili = benimOyum?.option_id === s.id;

                if (sonuclariGoster) {
                  return (
                    <div
                      key={s.id}
                      className={`relative overflow-hidden rounded-2xl bg-card2 ${
                        secili ? "ring-2 ring-brand" : ""
                      }`}
                    >
                      <div
                        className="btn-brand absolute inset-y-0 left-0 opacity-30"
                        style={{ width: `${yuzde}%` }}
                      />
                      <div className="relative flex items-center justify-between px-4 py-3 text-sm">
                        <span className="font-medium">
                          {secili && "✓ "}
                          {s.label}
                        </span>
                        <span className="text-muted">
                          %{yuzde} · {sayi}
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={s.id}
                    onClick={() => oyVer(a, s.id)}
                    className="w-full rounded-2xl bg-card2 px-4 py-3 text-left text-sm font-medium transition hover:ring-2 hover:ring-brand"
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-muted">
              <span>{toplam} oy</span>
              {yonetebilir && (
                <span className="flex gap-3">
                  <button
                    onClick={() => durumDegistir(a)}
                    className="hover:text-ink"
                  >
                    {a.is_active ? "Kapat" : "Yeniden aç"}
                  </button>
                  <button
                    onClick={() => anketSil(a)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Sil
                  </button>
                </span>
              )}
            </div>
          </section>
        );
      })}
    </main>
  );
}