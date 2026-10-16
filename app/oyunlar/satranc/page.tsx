"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import { hataCevir } from "../../../components/PostCard";

type Oyun = {
  id: string;
  status: "waiting" | "active" | "finished";
  creator_id: string;
  white_id: string | null;
  black_id: string | null;
  result: "white" | "black" | "draw" | null;
  move_count: number;
  time_base_sec: number;
  increment_sec: number;
  is_private: boolean;
  white: { username: string } | null;
  black: { username: string } | null;
};

const SORGU =
  "id, status, creator_id, white_id, black_id, result, move_count, time_base_sec, increment_sec, is_private, white:profiles!chess_games_white_id_fkey(username), black:profiles!chess_games_black_id_fkey(username)";

const SURELER = [
  { etiket: "3 dk", sure: 180, artis: 0 },
  { etiket: "5 dk", sure: 300, artis: 0 },
  { etiket: "10 dk", sure: 600, artis: 0 },
  { etiket: "10+5", sure: 600, artis: 5 },
  { etiket: "15+10", sure: 900, artis: 10 },
];

function sureEtiketi(o: { time_base_sec: number; increment_sec: number }) {
  const dk = Math.round(o.time_base_sec / 60);
  return o.increment_sec ? `${dk}+${o.increment_sec}` : `${dk} dk`;
}

export default function SatrancLobisi() {
  const supabase = createClient();
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [bekleyen, setBekleyen] = useState<Oyun[]>([]);
  const [benim, setBenim] = useState<Oyun[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");
  const [renk, setRenk] = useState("random");
  const [sureIdx, setSureIdx] = useState(2);
  const [ozel, setOzel] = useState(false);
  const [kod, setKod] = useState("");
  const [islem, setIslem] = useState(false);

  async function getir(kullaniciId: string | null) {
    await supabase.rpc("satranc_temizle");
    const { data: b, error } = await supabase
      .from("chess_games")
      .select(SORGU)
      .eq("status", "waiting")
      .eq("is_private", false)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) setHata(error.message);
    else setBekleyen((b as unknown as Oyun[]) || []);

    if (kullaniciId) {
      const { data: m } = await supabase
        .from("chess_games")
        .select(SORGU)
        .or(`white_id.eq.${kullaniciId},black_id.eq.${kullaniciId},creator_id.eq.${kullaniciId}`)
        .order("updated_at", { ascending: false })
        .limit(15);
      setBenim((m as unknown as Oyun[]) || []);
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
    const s = SURELER[sureIdx];
    const { data, error } = await supabase.rpc("satranc_olustur", {
      renk,
      sure: s.sure,
      artis: s.artis,
      ozel,
    });
    setIslem(false);
    if (error) {
      setHata(hataCevir(error.message));
      return;
    }
    router.push(`/oyunlar/satranc/${data as string}`);
  }

  async function katil(id: string) {
    if (islem) return;
    setHata("");
    setIslem(true);
    const { error } = await supabase.rpc("satranc_katil", { gid: id });
    setIslem(false);
    if (error) {
      setHata(hataCevir(error.message));
      await getir(uid);
      return;
    }
    router.push(`/oyunlar/satranc/${id}`);
  }

  async function kodlaKatil(e: React.FormEvent) {
    e.preventDefault();
    if (islem || !kod.trim()) return;
    setHata("");
    setIslem(true);
    const { data, error } = await supabase.rpc("satranc_kodla_katil", {
      kod: kod.trim(),
    });
    setIslem(false);
    if (error) {
      setHata(hataCevir(error.message));
      return;
    }
    router.push(`/oyunlar/satranc/${data as string}`);
  }

  function durumMetni(o: Oyun) {
    if (o.status === "waiting") return "Rakip bekleniyor";
    if (o.status === "active") return `Devam ediyor · ${o.move_count} hamle`;
    if (o.result === "draw") return "Berabere";
    if (!o.result) return "Bitti";
    const kazanan = o.result === "white" ? o.white?.username : o.black?.username;
    return `${kazanan ?? "?"} kazandı`;
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 p-4">
        <div className="h-40 animate-pulse rounded-3xl border border-line bg-card" />
      </main>
    );
  }

  const baskalari = bekleyen.filter((o) => o.creator_id !== uid);
  const acik = benim.find((o) => o.status !== "finished");
  const bitenler = benim.filter((o) => o.status === "finished").slice(0, 5);

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <Link href="/oyunlar" className="text-sm text-muted hover:text-ink">
        ← Oyunlar
      </Link>

      <section className="btn-brand rounded-3xl p-6">
        <h2 className="text-2xl font-extrabold">♟️ Satranç</h2>
        <p className="mt-1 text-sm opacity-90">
          Saatli, online. Herkese açık oyun aç ya da özel oda kurup kodu
          arkadaşına ver.
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

      {uid && acik && (
        <Link
          href={`/oyunlar/satranc/${acik.id}`}
          className="block rounded-3xl border border-brand bg-card p-4 transition hover:-translate-y-0.5"
        >
          <p className="font-bold">
            {acik.status === "active" ? "♟️ Devam eden oyunun var" : "⏳ Açık odan var"}
          </p>
          <p className="text-sm text-muted">
            {acik.is_private ? "🔒 Özel oda · " : ""}
            {sureEtiketi(acik)} · {durumMetni(acik)} → oyuna dön
          </p>
        </Link>
      )}

      {uid && !acik && (
        <section className="space-y-3 rounded-3xl border border-line bg-card p-4">
          <h3 className="font-bold">Yeni oyun</h3>

          <div className="flex flex-wrap gap-2">
            {SURELER.map((s, i) => (
              <button
                key={s.etiket}
                onClick={() => setSureIdx(i)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  sureIdx === i ? "btn-brand" : "bg-card2 text-muted hover:text-ink"
                }`}
              >
                ⏱ {s.etiket}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["random", "🎲 Rastgele"],
                ["white", "⚪ Beyaz"],
                ["black", "⚫ Siyah"],
              ] as const
            ).map(([a, e]) => (
              <button
                key={a}
                onClick={() => setRenk(a)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  renk === a ? "btn-brand" : "bg-card2 text-muted hover:text-ink"
                }`}
              >
                {e}
              </button>
            ))}
          </div>

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
                Lobide görünmez, sadece kodu bilen katılır.
              </span>
            </span>
          </label>

          <button
            onClick={olustur}
            disabled={islem}
            className="btn-brand w-full rounded-xl p-3 font-semibold"
          >
            {islem ? "Açılıyor..." : ozel ? "Özel oda kur" : "Oyun aç"}
          </button>
          <p className="text-xs text-muted">
            Aynı anda tek açık oyunun olabilir. Süren dolarsan oyun kaybedilmiş
            sayılır, rakip gelmeyen oda 15 dakikada kapanır.
          </p>
        </section>
      )}

      {uid && !acik && (
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
      )}

      <section className="space-y-2">
        <h3 className="font-bold">Rakip bekleyenler</h3>
        {baskalari.length === 0 && (
          <div className="rounded-3xl border border-dashed border-line py-8 text-center text-sm text-muted">
            Şu an bekleyen oyun yok. Sen bir tane aç!
          </div>
        )}
        {baskalari.map((o) => {
          const sahip = o.white ?? o.black;
          return (
            <div
              key={o.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  @{sahip?.username ?? "?"}
                </p>
                <p className="text-xs text-muted">
                  ⏱ {sureEtiketi(o)} ·{" "}
                  {o.white_id ? "⚪ Beyaz olarak bekliyor" : "⚫ Siyah olarak bekliyor"}
                </p>
              </div>
              {uid && !acik && (
                <button
                  onClick={() => katil(o.id)}
                  disabled={islem}
                  className="btn-brand rounded-xl px-5 py-2 text-sm font-semibold"
                >
                  Katıl
                </button>
              )}
            </div>
          );
        })}
      </section>

      {uid && bitenler.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-bold">Son oyunlarım</h3>
          {bitenler.map((o) => {
            const rakip =
              o.white_id === uid ? o.black?.username : o.white?.username;
            return (
              <Link
                key={o.id}
                href={`/oyunlar/satranc/${o.id}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 transition hover:-translate-y-0.5"
              >
                <span className="text-2xl">🏁</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {rakip ? `@${rakip} ile` : "Rakipsiz"}
                  </p>
                  <p className="text-xs text-muted">
                    {sureEtiketi(o)} · {durumMetni(o)}
                  </p>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}