"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";

type Davet = {
  invited_id: string;
  created_at: string;
  profiles: { username: string } | null;
};

export default function DavetSayfasi() {
  const supabase = createClient();
  const [kod, setKod] = useState("");
  const [davetler, setDavetler] = useState<Davet[]>([]);
  const [ozet, setOzet] = useState({ toplam: 0, gecerli: 0 });
  const [girisVar, setGirisVar] = useState(true);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kopyalandi, setKopyalandi] = useState("");
  const [hata, setHata] = useState("");

  useEffect(() => {
    async function baslat() {
      const { data: k } = await supabase.auth.getUser();
      if (!k.user) {
        setGirisVar(false);
        setYukleniyor(false);
        return;
      }
      const { data: c } = await supabase
        .from("invite_codes")
        .select("code")
        .eq("user_id", k.user.id)
        .maybeSingle();
      setKod(c?.code ?? "");

      const { data: d, error } = await supabase
        .from("referrals")
        .select("invited_id, created_at, profiles!referrals_invited_id_fkey(username)")
        .eq("inviter_id", k.user.id)
        .order("created_at", { ascending: false });
      if (error) setHata(error.message);
      setDavetler((d as unknown as Davet[]) || []);

      const { data: o } = await supabase.rpc("davet_ozet");
      const satir = ((o as { toplam: number; gecerli: number }[]) || [])[0];
      if (satir) setOzet(satir);
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const link =
    typeof window !== "undefined" && kod
      ? `${window.location.origin}/giris?davet=${kod}`
      : "";

  async function kopyala(metin: string, etiket: string) {
    try {
      await navigator.clipboard.writeText(metin);
      setKopyalandi(etiket);
      setTimeout(() => setKopyalandi(""), 2000);
    } catch {
      setHata("Kopyalanamadı: " + metin);
    }
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <div className="h-40 animate-pulse rounded-3xl border border-line bg-card" />
      </main>
    );
  }

  if (!girisVar) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <p className="text-4xl">📣</p>
        <p className="text-muted">Davet kodunu görmek için giriş yapmalısın.</p>
        <Link href="/giris" className="text-brand hover:underline">
          Giriş yap
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <section className="btn-brand space-y-3 rounded-3xl p-6">
        <div>
          <h2 className="text-2xl font-extrabold">📣 Arkadaşını davet et</h2>
          <p className="mt-1 text-sm opacity-90">
            Kodunla kayıt olan her arkadaşın için görev ilerlemesi kazanırsın.
          </p>
        </div>
        <div className="rounded-2xl bg-white/15 p-4 text-center">
          <p className="text-xs opacity-90">Davet kodun</p>
          <p className="font-mono text-3xl font-extrabold tracking-[0.3em]">
            {kod || "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => kopyala(kod, "kod")}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-black"
          >
            {kopyalandi === "kod" ? "✓ Kopyalandı" : "Kodu kopyala"}
          </button>
          <button
            onClick={() => kopyala(link, "link")}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-black"
          >
            {kopyalandi === "link" ? "✓ Kopyalandı" : "🔗 Davet linki"}
          </button>
          {link && (
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Beat'e katıl, hayran topluluğuna gel! ${link}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-white/20 px-4 py-2 text-sm font-bold"
            >
              WhatsApp
            </a>
          )}
        </div>
      </section>

      {hata && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-3xl border border-line bg-card p-4">
          <p className="text-3xl font-extrabold">{ozet.toplam}</p>
          <p className="text-xs text-muted">kayıt olan</p>
        </div>
        <div className="rounded-3xl border border-line bg-card p-4">
          <p className="text-3xl font-extrabold text-brand">{ozet.gecerli}</p>
          <p className="text-xs text-muted">görevde sayılan</p>
        </div>
      </div>

      <p className="rounded-2xl border border-line bg-card p-3 text-xs text-muted">
        Görevde sayılması için davet ettiğin hesabın en az 1 günlük olması ve
        en az bir gönderi ya da yorum yapmış olması gerekir.{" "}
        <Link href="/gorevler" className="font-semibold text-brand">
          Görevlere git →
        </Link>
      </p>

      <section className="space-y-2">
        <h3 className="font-bold">Davet ettiklerin</h3>
        {davetler.length === 0 && (
          <div className="rounded-3xl border border-dashed border-line py-8 text-center text-sm text-muted">
            Henüz kimse kodunla kayıt olmadı.
          </div>
        )}
        {davetler.map((d) => (
          <Link
            key={d.invited_id}
            href={`/profil/${d.profiles?.username ?? ""}`}
            className="flex items-center justify-between rounded-2xl border border-line bg-card p-3 transition hover:-translate-y-0.5"
          >
            <span className="font-semibold">
              @{d.profiles?.username ?? "bilinmiyor"}
            </span>
            <span className="text-xs text-muted">
              {new Date(d.created_at).toLocaleDateString("tr-TR")}
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}