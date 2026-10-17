"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";

type Gorev = {
  id: string;
  name: string;
  description: string;
  metric: string;
  target: number;
  reward_type: string;
  reward_label: string;
  sort_order: number;
  stage: string;
  stage_order: number;
};

type Gunluk = {
  id: string;
  name: string;
  description: string;
  metric: string;
  target: number;
  points: number;
  sort_order: number;
};

type Durum = { quest_id: string; ilerleme: number; alindi: boolean };
type Ozet = { puan: number; seri: number; gunluk_acik: boolean };

const IKON: Record<string, string> = {
  frame: "🖼️",
  title: "✦",
  theme: "🎨",
  ability: "🔑",
};

const ASAMALAR: Record<number, { ad: string; ikon: string }> = {
  1: { ad: "Başlangıç", ikon: "🌱" },
  2: { ad: "Gelişme", ikon: "📈" },
  3: { ad: "Alışma", ikon: "🔥" },
  4: { ad: "Son Vuruş", ikon: "💥" },
  5: { ad: "Usta", ikon: "🏆" },
  6: { ad: "Efsane", ikon: "👑" },
    7: { ad: "Elçi", ikon: "📣" },
};

type KartProps = {
  ad: string;
  aciklama: string;
  ilerleme: number;
  hedef: number;
  alindi: boolean;
  kilitli: boolean;
  odul: string;
  yukleniyor: boolean;
  onAl: () => void;
};

function Kart({
  ad,
  aciklama,
  ilerleme,
  hedef,
  alindi,
  kilitli,
  odul,
  yukleniyor,
  onAl,
}: KartProps) {
  const gercek = Math.min(ilerleme, hedef);
  const yuzde = Math.round((gercek / hedef) * 100);
  const hazir = !alindi && !kilitli && gercek >= hedef;
  return (
    <section
      className={`space-y-2 rounded-2xl border bg-card p-4 ${
        hazir ? "border-brand" : "border-line"
      } ${kilitli ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold">{ad}</h3>
          <p className="text-sm text-muted">{aciklama}</p>
        </div>
        {alindi ? (
          <span className="shrink-0 rounded-full bg-card2 px-3 py-1 text-xs font-semibold text-green-500">
            ✓ Alındı
          </span>
        ) : kilitli ? (
          <span className="shrink-0 text-lg">🔒</span>
        ) : hazir ? (
          <button
            onClick={onAl}
            disabled={yukleniyor}
            className="btn-brand shrink-0 rounded-lg px-4 py-2 text-sm font-semibold"
          >
            {yukleniyor ? "..." : "Ödülü al"}
          </button>
        ) : null}
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-card2">
        <div
          className="btn-brand h-full rounded-full"
          style={{ width: `${kilitli ? 0 : yuzde}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          {kilitli ? "Kilitli" : `${gercek}/${hedef}`}
        </span>
        <span className="font-semibold text-brand">{odul}</span>
      </div>
    </section>
  );
}

export default function GorevlerSayfasi() {
  const supabase = createClient();
  const [gorevler, setGorevler] = useState<Gorev[]>([]);
  const [durumlar, setDurumlar] = useState<Record<string, Durum>>({});
  const [gunlukler, setGunlukler] = useState<Gunluk[]>([]);
  const [gunlukDurum, setGunlukDurum] = useState<Record<string, Durum>>({});
  const [ozet, setOzet] = useState<Ozet>({ puan: 0, seri: 0, gunluk_acik: false });
  const [girisVar, setGirisVar] = useState(true);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");
  const [basari, setBasari] = useState("");
  const [aliniyor, setAliniyor] = useState<string | null>(null);

  async function getir() {
    const { data: g, error } = await supabase
      .from("quests")
      .select(
        "id, name, description, metric, target, reward_type, reward_label, sort_order, stage, stage_order"
      )
      .order("stage_order")
      .order("sort_order");
    if (error) {
      setHata(error.message);
      return;
    }
    setGorevler(g || []);

    const { data: d, error: e1 } = await supabase.rpc("gorev_durumum");
    if (e1) {
      setHata(e1.message);
      return;
    }
    const harita: Record<string, Durum> = {};
    for (const x of (d as Durum[]) || []) harita[x.quest_id] = x;
    setDurumlar(harita);

    const { data: gl } = await supabase
      .from("daily_quests")
      .select("id, name, description, metric, target, points, sort_order")
      .order("sort_order");
    setGunlukler(gl || []);

    const { data: gd, error: e2 } = await supabase.rpc("gunluk_durumum");
    if (e2) {
      setHata(e2.message);
      return;
    }
    const gHarita: Record<string, Durum> = {};
    for (const x of (gd as Durum[]) || []) gHarita[x.quest_id] = x;
    setGunlukDurum(gHarita);

    const { data: oz, error: e3 } = await supabase.rpc("gorev_ozet");
    if (e3) {
      setHata(e3.message);
      return;
    }
    const satir = ((oz as Ozet[]) || [])[0];
    if (satir) setOzet(satir);
  }

  useEffect(() => {
    async function baslat() {
      const { data: kullanici } = await supabase.auth.getUser();
      if (!kullanici.user) {
        setGirisVar(false);
        setYukleniyor(false);
        return;
      }
      await getir();
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function odulAl(g: Gorev) {
    setHata("");
    setBasari("");
    setAliniyor(g.id);
    const { data, error } = await supabase.rpc("gorev_odulu_al", { gid: g.id });
    if (error) setHata(error.message);
    else {
      setBasari(`🎉 Ödül kazandın: ${data as string}`);
      await getir();
    }
    setAliniyor(null);
  }

  async function gunlukAl(g: Gunluk) {
    setHata("");
    setBasari("");
    setAliniyor(g.id);
    const { data, error } = await supabase.rpc("gunluk_odulu_al", { gid: g.id });
    if (error) setHata(error.message);
    else {
      setBasari(`☀️ +${data as number} puan kazandın!`);
      await getir();
    }
    setAliniyor(null);
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-line bg-card"
          />
        ))}
      </main>
    );
  }

  if (!girisVar) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <p className="text-4xl">🎯</p>
        <p className="text-muted">Görevleri görmek için giriş yapmalısın.</p>
        <Link href="/giris" className="text-brand hover:underline">
          Giriş yap
        </Link>
      </main>
    );
  }

  const asamaNolari = Array.from(new Set(gorevler.map((g) => g.stage_order))).sort(
    (a, b) => a - b
  );
  const asamaTamam = (n: number) =>
    gorevler.filter((g) => g.stage_order === n).every((g) => durumlar[g.id]?.alindi);
  const asamaAcik = (n: number) => {
    const sira = asamaNolari.indexOf(n);
    return sira <= 0 || asamaTamam(asamaNolari[sira - 1]);
  };

  const alinan = gorevler.filter((g) => durumlar[g.id]?.alindi).length;
  const seviye = Math.floor(ozet.puan / 50) + 1;
  const seviyeIlerleme = ozet.puan % 50;

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <section className="btn-brand space-y-3 rounded-2xl p-6">
        <div>
          <h2 className="text-2xl font-extrabold">🎯 Görevler</h2>
          <p className="mt-1 text-sm opacity-90">
            Aşamaları sırayla tamamla, ödülleri kazan; sonra günlük görevlere geç.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/15 p-2">
            <p className="text-xl font-extrabold">
              {alinan}/{gorevler.length}
            </p>
            <p className="text-xs opacity-90">ödül</p>
          </div>
          <div className="rounded-xl bg-white/15 p-2">
            <p className="text-xl font-extrabold">{ozet.puan}</p>
            <p className="text-xs opacity-90">puan</p>
          </div>
          <div className="rounded-xl bg-white/15 p-2">
            <p className="text-xl font-extrabold">🔥 {ozet.seri}</p>
            <p className="text-xs opacity-90">gün seri</p>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs opacity-90">
            <span>Seviye {seviye}</span>
            <span>{seviyeIlerleme}/50</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${(seviyeIlerleme / 50) * 100}%` }}
            />
          </div>
        </div>
      </section>

      <Link
        href="/ozellestir"
        className="block rounded-2xl border border-line bg-card p-4 text-center font-semibold transition hover:-translate-y-0.5"
      >
        🎨 Kazandıklarını takmak için Özelleştir&apos;e git →
      </Link>

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

      {asamaNolari.map((n) => {
        const liste = gorevler.filter((g) => g.stage_order === n);
        const acik = asamaAcik(n);
        const tamam = asamaTamam(n);
        const bilgi = ASAMALAR[n] ?? { ad: `Aşama ${n}`, ikon: "⭐" };
        const alinanSayi = liste.filter((g) => durumlar[g.id]?.alindi).length;
        return (
          <div key={n} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-extrabold">
                {bilgi.ikon} {n}. Aşama · {bilgi.ad}
              </h3>
              <span
                className={`rounded-full bg-card2 px-3 py-1 text-xs font-semibold ${
                  tamam ? "text-green-500" : acik ? "text-brand" : "text-muted"
                }`}
              >
                {tamam ? "✓ Tamamlandı" : acik ? `${alinanSayi}/${liste.length}` : "🔒 Kilitli"}
              </span>
            </div>
            {!acik && (
              <p className="px-1 text-xs text-muted">
                Bu aşamayı açmak için önceki aşamanın tüm ödüllerini al.
              </p>
            )}
            {liste.map((g) => (
              <Kart
                key={g.id}
                ad={g.name}
                aciklama={g.description}
                ilerleme={durumlar[g.id]?.ilerleme ?? 0}
                hedef={g.target}
                alindi={!!durumlar[g.id]?.alindi}
                kilitli={!acik}
                odul={`${IKON[g.reward_type] ?? "🎁"} ${g.reward_label}`}
                yukleniyor={aliniyor === g.id}
                onAl={() => odulAl(g)}
              />
            ))}
          </div>
        );
      })}

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-extrabold">☀️ Günlük görevler</h3>
          <span
            className={`rounded-full bg-card2 px-3 py-1 text-xs font-semibold ${
              ozet.gunluk_acik ? "text-brand" : "text-muted"
            }`}
          >
            {ozet.gunluk_acik ? "Her gün 00:00'da yenilenir" : "🔒 Kilitli"}
          </span>
        </div>
        {!ozet.gunluk_acik && (
          <p className="px-1 text-xs text-muted">
                      Günlük görevler, ilk 4 aşamanın tüm ödüllerini aldıktan sonra açılır.
          </p>
        )}
        {gunlukler.map((g) => (
          <Kart
            key={g.id}
            ad={g.name}
            aciklama={g.description}
            ilerleme={gunlukDurum[g.id]?.ilerleme ?? 0}
            hedef={g.target}
            alindi={!!gunlukDurum[g.id]?.alindi}
            kilitli={!ozet.gunluk_acik}
            odul={`⭐ +${g.points} puan`}
            yukleniyor={aliniyor === g.id}
            onAl={() => gunlukAl(g)}
          />
        ))}
      </div>
    </main>
  );
}