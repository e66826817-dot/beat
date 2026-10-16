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
  updated_at: string;
  white: { username: string } | null;
  black: { username: string } | null;
};

const SORGU =
  "id, status, creator_id, white_id, black_id, result, move_count, updated_at, white:profiles!chess_games_white_id_fkey(username), black:profiles!chess_games_black_id_fkey(username)";

export default function SatrancLobisi() {
  const supabase = createClient();
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [bekleyen, setBekleyen] = useState<Oyun[]>([]);
  const [benim, setBenim] = useState<Oyun[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");
  const [renk, setRenk] = useState("random");
  const [islem, setIslem] = useState(false);

  async function getir(kullaniciId: string | null) {
    const birGun = new Date(Date.now() - 86400000).toISOString();
    const { data: b, error } = await supabase
      .from("chess_games")
      .select(SORGU)
      .eq("status", "waiting")
      .gt("created_at", birGun)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) setHata(error.message);
    else setBekleyen((b as unknown as Oyun[]) || []);

    if (kullaniciId) {
      const { data: m } = await supabase
        .from("chess_games")
        .select(SORGU)
        .or(`white_id.eq.${kullaniciId},black_id.eq.${kullaniciId}`)
        .order("updated_at", { ascending: false })
        .limit(20);
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
      sayac = setInterval(() => getir(id), 5000);
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
    const { data, error } = await supabase.rpc("satranc_olustur", { renk });
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

  function durumMetni(o: Oyun) {
    if (o.status === "waiting") return "Rakip bekleniyor";
    if (o.status === "active") return `Devam ediyor · ${o.move_count} hamle`;
    if (o.result === "draw") return "Berabere";
    if (!o.result) return "Süresi doldu";
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

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <Link href="/oyunlar" className="text-sm text-muted hover:text-ink">
        ← Oyunlar
      </Link>

      <section className="btn-brand rounded-3xl p-6">
        <h2 className="text-2xl font-extrabold">♟️ Satranç</h2>
        <p className="mt-1 text-sm opacity-90">
          Yeni oyun aç, linkini paylaş ya da aşağıdan bir oyuna katıl.
        </p>
      </section>

      {hata && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}

      {uid ? (
        <section className="space-y-3 rounded-3xl border border-line bg-card p-4">
          <h3 className="font-bold">Yeni oyun</h3>
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
          <button
            onClick={olustur}
            disabled={islem}
            className="btn-brand w-full rounded-xl p-3 font-semibold"
          >
            {islem ? "Açılıyor..." : "Oyun aç"}
          </button>
          <p className="text-xs text-muted">
            En fazla 3 açık oyunun olabilir. Görevlerde sayılması için maçın
            en az 10 hamle sürmesi gerekir.
          </p>
        </section>
      ) : (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-muted">
          Oynamak için{" "}
          <Link href="/giris" className="text-brand hover:underline">
            giriş yap
          </Link>
          .
        </p>
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
                  {o.white_id ? "⚪ Beyaz olarak bekliyor" : "⚫ Siyah olarak bekliyor"}
                </p>
              </div>
              {uid && (
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

      {uid && (
        <section className="space-y-2">
          <h3 className="font-bold">Oyunlarım</h3>
          {benim.length === 0 && (
            <div className="rounded-3xl border border-dashed border-line py-8 text-center text-sm text-muted">
              Henüz oyunun yok.
            </div>
          )}
          {benim.map((o) => {
            const rakip =
              o.white_id === uid ? o.black?.username : o.white?.username;
            return (
              <Link
                key={o.id}
                href={`/oyunlar/satranc/${o.id}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 transition hover:-translate-y-0.5"
              >
                <span className="text-2xl">
                  {o.status === "active" ? "♟️" : o.status === "waiting" ? "⏳" : "🏁"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {rakip ? `@${rakip} ile` : "Rakip bekleniyor"}
                  </p>
                  <p className="text-xs text-muted">{durumMetni(o)}</p>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}