"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { hataCevir } from "../../components/PostCard";

type Aday = {
  tip: "group" | "artist";
  hedef: string;
  ad: string;
  gorsel: string | null;
  baglanti: string | null;
  oy: number;
};

export default function GununArtistiSayfasi() {
  const supabase = createClient();
  const [bugun, setBugun] = useState<Aday[]>([]);
  const [dun, setDun] = useState<Aday | null>(null);
  const [oyum, setOyum] = useState<{ tip: string; hedef: string } | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [ara, setAra] = useState("");
  const [yukleniyor, setYukleniyor] = useState(true);
  const [islem, setIslem] = useState(false);
  const [hata, setHata] = useState("");

  async function getir(kullaniciId: string | null) {
    const [b, d] = await Promise.all([
      supabase.rpc("artist_siralama", { gun_farki: 0 }),
      supabase.rpc("artist_siralama", { gun_farki: 1 }),
    ]);
    if (b.error) setHata(b.error.message);
    setBugun((b.data as Aday[]) || []);
    const ilk = ((d.data as Aday[]) || [])[0];
    setDun(ilk && ilk.oy > 0 ? ilk : null);
    if (kullaniciId) {
      const { data } = await supabase.rpc("artist_benim_oyum");
      const s = ((data as { tip: string; hedef: string }[]) || [])[0];
      setOyum(s ?? null);
    }
  }

  useEffect(() => {
    async function baslat() {
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id ?? null;
      setUid(id);
      await getir(id);
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function oyVer(a: Aday) {
    if (islem) return;
    setHata("");
    setIslem(true);
    const { error } = await supabase.rpc("artist_oy_ver", {
      tip: a.tip,
      hedef: a.hedef,
    });
    if (error) setHata(hataCevir(error.message));
    await getir(uid);
    setIslem(false);
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 p-4">
        <div className="h-32 animate-pulse rounded-3xl border border-line bg-card" />
      </main>
    );
  }

  const enCok = Math.max(1, ...bugun.map((a) => a.oy));
  const filtreli = bugun.filter((a) =>
    a.ad.toLowerCase().includes(ara.trim().toLowerCase())
  );

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <section className="btn-brand rounded-3xl p-6">
        <h2 className="text-2xl font-extrabold">⭐ Günün artisti</h2>
        <p className="mt-1 text-sm opacity-90">
          Her gün 1 oy hakkın var. Sonuçlar gece 00:00&apos;da kapanır, en çok oy
          alan ertesi gün ilan edilir.
        </p>
      </section>

      {dun && (
        <section className="rounded-3xl border border-brand bg-card p-4 text-center">
          <p className="text-xs font-semibold text-muted">🏆 Dünün artisti</p>
          <p className="mt-1 text-2xl font-extrabold">{dun.ad}</p>
          <p className="text-sm text-muted">{dun.oy} oy</p>
        </section>
      )}

      {!uid && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-muted">
          Oy vermek için{" "}
          <Link href="/giris" className="text-brand hover:underline">
            giriş yap
          </Link>
          .
        </p>
      )}
      {uid && oyum && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-green-500">
          ✓ Bugünkü oyunu kullandın. Yarın yeniden oy verebilirsin.
        </p>
      )}
      {hata && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}

      <input
        value={ara}
        onChange={(e) => setAra(e.target.value)}
        placeholder="🔍 Aday ara"
        className="w-full rounded-2xl border border-line bg-card p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand"
      />

      <div className="space-y-2">
        {filtreli.map((a) => {
          const benimki = oyum?.tip === a.tip && oyum?.hedef === a.hedef;
          return (
            <div
              key={`${a.tip}-${a.hedef}`}
              className={`relative overflow-hidden rounded-2xl border bg-card ${
                benimki ? "border-brand" : "border-line"
              }`}
            >
              <div
                className="btn-brand absolute inset-y-0 left-0 opacity-15"
                style={{ width: `${(a.oy / enCok) * 100}%` }}
              />
              <div className="relative flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  {a.baglanti ? (
                    <Link
                      href={a.baglanti}
                      className="block truncate font-semibold hover:text-brand"
                    >
                      {a.ad}
                    </Link>
                  ) : (
                    <p className="truncate font-semibold">{a.ad}</p>
                  )}
                  <p className="text-xs text-muted">
                    {a.tip === "group" ? "Grup / solo" : "TR pop"} · {a.oy} oy
                  </p>
                </div>
                {uid && !oyum && (
                  <button
                    onClick={() => oyVer(a)}
                    disabled={islem}
                    className="btn-brand rounded-xl px-4 py-2 text-sm font-semibold"
                  >
                    Oy ver
                  </button>
                )}
                {benimki && (
                  <span className="text-sm font-semibold text-brand">
                    ✓ Oyun
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {filtreli.length === 0 && (
          <div className="rounded-3xl border border-dashed border-line py-10 text-center text-sm text-muted">
            Aday bulunamadı. Grup ve sanatçıları admin ekler.
          </div>
        )}
      </div>
    </main>
  );
}