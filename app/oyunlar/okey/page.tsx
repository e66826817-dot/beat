"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { hataCevir } from "../../../components/PostCard";

type Oda = {
  id: string;
  creator_id: string;
  players: string[];
  is_private: boolean;
  status: "waiting" | "active" | "finished";
};

export default function OkeyLobisi() {
  const supabase = createClient();
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [bekleyen, setBekleyen] = useState<Oda[]>([]);
  const [benim, setBenim] = useState<Oda | null>(null);
  const [adlar, setAdlar] = useState<Record<string, string>>({});
  const [ozel, setOzel] = useState(false);
  const [kod, setKod] = useState("");
  const [yukleniyor, setYukleniyor] = useState(true);
  const [islem, setIslem] = useState(false);
  const [hata, setHata] = useState("");

  async function getir(kullaniciId: string | null) {
    await supabase.rpc("okey_temizle");
    const { data: b } = await supabase
      .from("okey_games")
      .select("id, creator_id, players, is_private, status")
      .eq("status", "waiting")
      .eq("is_private", false)
      .order("created_at", { ascending: false })
      .limit(20);
    const liste = (b as Oda[]) || [];
    setBekleyen(liste);

    let acik: Oda | null = null;
    if (kullaniciId) {
      const { data: m } = await supabase
        .from("okey_games")
        .select("id, creator_id, players, is_private, status")
        .contains("players", [kullaniciId])
        .in("status", ["waiting", "active"])
        .limit(1);
      acik = ((m as Oda[]) || [])[0] ?? null;
      setBenim(acik);
    }

    const idler = Array.from(
      new Set([...liste.flatMap((o) => o.players), ...(acik?.players ?? [])])
    );
    if (idler.length > 0) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", idler);
      const h: Record<string, string> = {};
      for (const x of p || []) h[x.id] = x.username;
      setAdlar(h);
    }
  }

  useEffect(() => {
    let sayac: ReturnType<typeof setInterval> | undefined;
    async function baslat() {
      const { data: k } = await supabase.auth.getUser();
      const id = k.user?.id ?? null;
      setUid(id);
      await getir(id);
      setYukleniyor(false);
      sayac = setInterval(() => {
        if (!document.hidden) getir(id);
      }, 5000);
    }
    baslat();
    return () => {
      if (sayac) clearInterval(sayac);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function olustur() {
    if (islem) return;
    setHata("");
    setIslem(true);
    const { data, error } = await supabase.rpc("okey_olustur", { ozel });
    setIslem(false);
    if (error) {
      setHata(hataCevir(error.message));
      return;
    }
    router.push(`/oyunlar/okey/${data as string}`);
  }

  async function katil(id: string) {
    if (islem) return;
    setHata("");
    setIslem(true);
    const { error } = await supabase.rpc("okey_katil", { gid: id });
    setIslem(false);
    if (error) {
      setHata(hataCevir(error.message));
      await getir(uid);
      return;
    }
    router.push(`/oyunlar/okey/${id}`);
  }

  async function kodlaKatil(e: React.FormEvent) {
    e.preventDefault();
    if (islem || kod.trim().length < 6) return;
    setHata("");
    setIslem(true);
    const { data, error } = await supabase.rpc("okey_kodla_katil", {
      kod: kod.trim(),
    });
    setIslem(false);
    if (error) {
      setHata(hataCevir(error.message));
      return;
    }
    router.push(`/oyunlar/okey/${data as string}`);
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <div className="h-40 animate-pulse rounded-3xl border border-line bg-card" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <Link href="/oyunlar" className="text-sm text-muted hover:text-ink">
        ← Oyunlar
      </Link>

      <section className="btn-brand rounded-3xl p-6">
        <h2 className="text-2xl font-extrabold">🎃 Okey</h2>
        <p className="mt-1 text-sm opacity-90">
          4 kişilik. Oda dolunca oyun başlar. Her hamle 45 saniye.
        </p>
      </section>

      {hata && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}

      {!uid && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-muted">
          Oynamak için{" "}
          <Link href="/giris" className="text-brand hover:underline">
            giriş yap
          </Link>
          .
        </p>
      )}

      {uid && benim && (
        <Link
          href={`/oyunlar/okey/${benim.id}`}
          className="block rounded-3xl border border-brand bg-card p-4 transition hover:-translate-y-0.5"
        >
          <p className="font-bold">
            {benim.status === "active"
              ? "🎃 Devam eden okey oyunun var"
              : `⏳ Açık odan var (${benim.players.length}/4)`}
          </p>
          <p className="text-sm text-muted">
            {benim.is_private ? "🔒 Özel oda · " : ""}
            oyuna dön →
          </p>
        </Link>
      )}

      {uid && !benim && (
        <>
          <section className="space-y-3 rounded-3xl border border-line bg-card p-4">
            <h3 className="font-bold">Yeni oda</h3>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-card2 p-3 text-sm">
              <input
                type="checkbox"
                checked={ozel}
                onChange={(e) => setOzel(e.target.checked)}
                className="h-5 w-5"
              />
              <span>
                🔒 <b>Özel oda</b>
                <span className="block text-xs text-muted">
                  Lobide görünmez, kodu bilen katılır.
                </span>
              </span>
            </label>
            <button
              onClick={olustur}
              disabled={islem}
              className="btn-brand w-full rounded-xl p-3 font-semibold"
            >
              {islem ? "Açılıyor..." : ozel ? "Özel oda kur" : "Oda aç"}
            </button>
            <p className="text-xs text-muted">
              Aynı anda tek açık oyunun olabilir. Dolmayan oda 15 dakikada
              kapanır.
            </p>
          </section>

          <form
            onSubmit={kodlaKatil}
            className="flex gap-2 rounded-3xl border border-line bg-card p-4"
          >
            <input
              value={kod}
              onChange={(e) => setKod(e.target.value.toUpperCase())}
              placeholder="Özel oda kodu"
              maxLength={6}
              className="min-w-0 flex-1 rounded-2xl bg-card2 p-3 uppercase tracking-widest text-ink outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-muted focus:ring-2 focus:ring-brand"
            />
            <button
              type="submit"
              disabled={islem || kod.trim().length < 6}
              className="btn-brand rounded-xl px-5 py-2 text-sm font-semibold"
            >
              Kodla katıl
            </button>
          </form>
        </>
      )}

      <section className="space-y-2">
        <h3 className="font-bold">Oyuncu bekleyen odalar</h3>
        {bekleyen.length === 0 && (
          <div className="rounded-3xl border border-dashed border-line py-8 text-center text-sm text-muted">
            Şu an açık oda yok. Sen bir tane aç!
          </div>
        )}
        {bekleyen.map((o) => (
          <div
            key={o.id}
            className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {o.players.map((p) => `@${adlar[p] ?? "?"}`).join(", ")}
              </p>
              <p className="text-xs text-muted">{o.players.length}/4 oyuncu</p>
            </div>
            {uid && !benim && (
              <button
                onClick={() => katil(o.id)}
                disabled={islem}
                className="btn-brand rounded-xl px-5 py-2 text-sm font-semibold"
              >
                Katıl
              </button>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}