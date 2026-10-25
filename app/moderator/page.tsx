"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";

type Satir = {
  uid: string;
  ad: string;
  gun: string;
  gonderi: number;
  yorum: number;
  muaf: boolean;
  tamam: boolean;
};

const HEDEF_G = 50;
const HEDEF_Y = 10;

function Cubuk({ deger, hedef }: { deger: number; hedef: number }) {
  const yuzde = Math.min(100, Math.round((deger / hedef) * 100));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-card2">
      <div className="btn-brand h-full rounded-full" style={{ width: `${yuzde}%` }} />
    </div>
  );
}

export default function ModeratorSayfasi() {
  const supabase = createClient();
  const [satirlar, setSatirlar] = useState<Satir[]>([]);
  const [rol, setRol] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");

  const bugun = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Europe/Istanbul",
  });

  async function getir() {
    const { data, error } = await supabase.rpc("moderator_aktiflik", {
      gun_sayisi: 7,
    });
    if (error) setHata(error.message);
    else setSatirlar((data as Satir[]) || []);
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
        setRol(p?.role ?? null);
        if (p?.role === "admin" || p?.role === "moderator") await getir();
      }
      setYukleniyor(false);
    }
    baslat();
    const sayac = setInterval(() => {
      if (!document.hidden) getir();
    }, 60000);
    return () => clearInterval(sayac);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <div className="h-40 animate-pulse rounded-3xl border border-line bg-card" />
      </main>
    );
  }

  if (rol !== "admin" && rol !== "moderator") {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <p className="text-4xl">🔒</p>
        <p className="text-muted">Bu sayfa moderatörler ve adminler içindir.</p>
        <Link href="/" className="text-brand hover:underline">
          Ana sayfaya dön
        </Link>
      </main>
    );
  }

  // Moderatöre göre grupla
  const gruplar = new Map<string, { ad: string; muaf: boolean; gunler: Satir[] }>();
  for (const s of satirlar) {
    const g = gruplar.get(s.uid) ?? { ad: s.ad, muaf: s.muaf, gunler: [] };
    g.gunler.push(s);
    gruplar.set(s.uid, g);
  }
  const liste = Array.from(gruplar.entries()).map(([uid, g]) => {
    const bugunSatir = g.gunler.find((x) => x.gun === bugun);
    const gecmis = g.gunler
      .filter((x) => x.gun !== bugun)
      .sort((a, b) => a.gun.localeCompare(b.gun));
    return { uid, ...g, bugunSatir, gecmis };
  });
  liste.sort(
    (a, b) =>
      Number(a.bugunSatir?.tamam ?? false) - Number(b.bugunSatir?.tamam ?? false) ||
      a.ad.localeCompare(b.ad)
  );

  const tamamlayan = liste.filter((m) => m.bugunSatir?.tamam).length;

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <section className="btn-brand rounded-3xl p-6">
        <h2 className="text-2xl font-extrabold">📋 Moderatör aktifliği</h2>
        <p className="mt-1 text-sm opacity-90">
          Günlük hedef: {HEDEF_G} gönderi + {HEDEF_Y} yorum (Türkiye saatiyle
          00:00&apos;da sıfırlanır).
        </p>
        {rol === "admin" && (
          <p className="mt-2 text-sm font-semibold">
            Bugün {liste.length} moderatörden {tamamlayan} kişi tamamladı.
          </p>
        )}
      </section>

      {hata && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}

      {liste.length === 0 && !hata && (
        <div className="rounded-3xl border border-dashed border-line py-12 text-center text-muted">
          <p className="text-4xl">📋</p>
          <p className="mt-2 px-4">
            {rol === "admin"
              ? "Henüz moderatör yok. /admin sayfasından Moderatör rolü ver."
              : "Moderatör kaydın bulunamadı."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {liste.map((m) => {
          const b = m.bugunSatir;
          const tamam = m.gecmis.filter((x) => x.tamam).length;
          return (
            <section
              key={m.uid}
              className={`space-y-3 rounded-3xl border bg-card p-4 ${
                b?.tamam || m.muaf ? "border-line" : "border-brand"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/profil/${m.ad}`}
                  className="font-bold hover:text-brand"
                >
                  @{m.ad}
                </Link>
                <span
                  className={`rounded-full bg-card2 px-3 py-1 text-xs font-semibold ${
                    m.muaf
                      ? "text-muted"
                      : b?.tamam
                      ? "text-green-500"
                      : "text-brand"
                  }`}
                >
                  {m.muaf ? "Muaf" : b?.tamam ? "✓ Bugün tamam" : "⏳ Devam ediyor"}
                </span>
              </div>

              {b && (
                <div className="space-y-2 text-sm">
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted">
                      <span>Gönderi</span>
                      <span>
                        {b.gonderi}/{HEDEF_G}
                      </span>
                    </div>
                    <Cubuk deger={b.gonderi} hedef={HEDEF_G} />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted">
                      <span>Yorum</span>
                      <span>
                        {b.yorum}/{HEDEF_Y}
                      </span>
                    </div>
                    <Cubuk deger={b.yorum} hedef={HEDEF_Y} />
                  </div>
                </div>
              )}

              {!m.muaf && m.gecmis.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted">
                    Önceki {m.gecmis.length} gün: {tamam}/{m.gecmis.length}{" "}
                    tamamlandı
                  </p>
                  <div className="flex gap-1.5">
                    {m.gecmis.map((x) => (
                      <span
                        key={x.gun}
                        title={`${x.gun}: ${x.gonderi} gönderi, ${x.yorum} yorum`}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                          x.tamam
                            ? "btn-brand"
                            : "bg-card2 text-red-400"
                        }`}
                      >
                        {x.tamam ? "✓" : "✗"}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}