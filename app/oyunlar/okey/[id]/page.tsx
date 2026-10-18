"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import { hataCevir } from "../../../../components/PostCard";
import OkeyTasi from "../../../../components/OkeyTasi";
import {
  RENK_AD,
  bitisBul,
  okeyBul,
  renkSirala,
  sayiSirala,
} from "../../../../lib/okey";

type Oyun = {
  id: string;
  creator_id: string;
  players: string[];
  is_private: boolean;
  invite_code: string | null;
  status: "waiting" | "active" | "finished";
  turn: number;
  phase: "draw" | "discard";
  indicator: number | null;
  pile_count: number;
  discards: Record<string, number[]>;
  turn_deadline: string | null;
  winner_id: string | null;
  win_groups: number[][] | null;
  end_reason: string | null;
};

type El = { user_id: string; tiles: number[] };

export default function OkeyOyunu() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const arama = useSearchParams();
  const id = params.id;
  const kodParam = (arama.get("kod") || "").toUpperCase();

  const [oyun, setOyun] = useState<Oyun | null>(null);
  const [eller, setEller] = useState<El[]>([]);
  const [adlar, setAdlar] = useState<Record<string, string>>({});
  const [benimId, setBenimId] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [bulunamadi, setBulunamadi] = useState(false);
  const [hata, setHata] = useState("");
  const [isleniyor, setIsleniyor] = useState(false);
  const [sira, setSira] = useState<number[]>([]);
  const [secili, setSecili] = useState<number | null>(null);
  const [fark, setFark] = useState(0);
  const [simdi, setSimdi] = useState(Date.now());
  const [kopyalandi, setKopyalandi] = useState(false);
  const durumRef = useRef("");
  const sonZamanAsimi = useRef(0);

  async function getir() {
    const [o, s] = await Promise.all([
      supabase.from("okey_games").select("*").eq("id", id).maybeSingle(),
      supabase.rpc("sunucu_simdi"),
    ]);
    if (s.data) setFark(new Date(s.data as string).getTime() - Date.now());
    if (o.error) {
      setHata(o.error.message);
      return;
    }
    if (!o.data) {
      setBulunamadi(true);
      return;
    }
    const g = o.data as unknown as Oyun;
    durumRef.current = g.status;
    setOyun(g);

    const { data: e } = await supabase
      .from("okey_hands")
      .select("user_id, tiles")
      .eq("game_id", id);
    setEller((e as El[]) || []);

    if (g.players.length > 0) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", g.players);
      const h: Record<string, string> = {};
      for (const x of p || []) h[x.id] = x.username;
      setAdlar(h);
    }
  }

  useEffect(() => {
    let sayac: ReturnType<typeof setInterval> | undefined;
    async function baslat() {
      const { data: k } = await supabase.auth.getUser();
      setBenimId(k.user?.id ?? null);
      await getir();
      setYukleniyor(false);
      sayac = setInterval(() => {
        if (document.hidden || durumRef.current === "finished") return;
        getir();
      }, 2000);
    }
    baslat();
    const saat = setInterval(() => setSimdi(Date.now()), 500);
    return () => {
      if (sayac) clearInterval(sayac);
      clearInterval(saat);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const koltuk = oyun && benimId ? oyun.players.indexOf(benimId) : -1;
  const benimEl = eller.find((e) => e.user_id === benimId)?.tiles ?? [];

  // Sunucudan gelen elin sırasını koru, yeni taşı sona ekle
  useEffect(() => {
    setSira((onceki) => {
      const kalan = onceki.filter((t) => benimEl.includes(t));
      const yeni = benimEl.filter((t) => !onceki.includes(t));
      return [...kalan, ...yeni];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [benimEl.join(",")]);

  const ok = oyun?.indicator != null ? okeyBul(oyun.indicator) : null;

  const kalanSn =
    oyun?.turn_deadline
      ? Math.max(
          0,
          Math.ceil(
            (new Date(oyun.turn_deadline).getTime() - (simdi + fark)) / 1000
          )
        )
      : 0;

  // Süre dolunca sunucuya bildir
  useEffect(() => {
    if (!oyun || oyun.status !== "active" || koltuk < 0) return;
    if (kalanSn > 0) return;
    if (Date.now() - sonZamanAsimi.current < 4000) return;
    sonZamanAsimi.current = Date.now();
    supabase.rpc("okey_zaman_asimi", { gid: oyun.id }).then(() => getir());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simdi]);

  async function rpc(ad: string, args: Record<string, unknown>) {
    setHata("");
    setIsleniyor(true);
    const { error } = await supabase.rpc(ad, args);
    if (error) setHata(hataCevir(error.message));
    await getir();
    setIsleniyor(false);
  }

  async function bitir() {
    if (!oyun || !ok) return;
    const sonuc = bitisBul(sira, ok, secili ?? undefined);
    if (!sonuc) {
      setHata(
        "Elin henüz bitmiyor. 14 taşın hepsi per olmalı (en az 3'lü seri ya da grup), bir taş da atılacak."
      );
      return;
    }
    setSecili(null);
    await rpc("okey_bitir", {
      gid: oyun.id,
      gruplar: sonuc.gruplar,
      atilan: sonuc.atilan,
    });
  }

  async function ozelKatil() {
    setHata("");
    setIsleniyor(true);
    const { error } = await supabase.rpc("okey_katil", { gid: id, kod: kodParam });
    if (error) {
      setHata(hataCevir(error.message));
      setIsleniyor(false);
      return;
    }
    setBulunamadi(false);
    await getir();
    setIsleniyor(false);
  }

  async function ayril() {
    if (!oyun) return;
    const { error } = await supabase.rpc("okey_ayril", { gid: oyun.id });
    if (error) {
      setHata(hataCevir(error.message));
      return;
    }
    router.push("/oyunlar/okey");
  }

  async function linkKopyala() {
    const adres = oyun?.is_private
      ? `${window.location.origin}/oyunlar/okey/${id}?kod=${oyun.invite_code}`
      : window.location.href;
    try {
      await navigator.clipboard.writeText(adres);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      setHata("Link kopyalanamadı: " + adres);
    }
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <div className="h-64 animate-pulse rounded-3xl border border-line bg-card" />
      </main>
    );
  }

  if (bulunamadi || !oyun) {
    return (
      <main className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
        <p className="text-4xl">{kodParam ? "🔒" : "🎃"}</p>
        {kodParam && benimId ? (
          <>
            <p className="text-muted">Bu özel bir oda. Katılmak ister misin?</p>
            {hata && <p className="text-sm text-yellow-500">{hata}</p>}
            <button
              onClick={ozelKatil}
              disabled={isleniyor}
              className="btn-brand rounded-xl px-6 py-3 font-semibold"
            >
              Odaya katıl
            </button>
          </>
        ) : kodParam ? (
          <p className="text-muted">
            Özel odaya katılmak için{" "}
            <Link href="/giris" className="text-brand hover:underline">
              giriş yap
            </Link>
            .
          </p>
        ) : (
          <p className="text-muted">Bu oda bulunamadı ya da süresi doldu.</p>
        )}
        <Link href="/oyunlar/okey" className="text-brand hover:underline">
          Okey lobisi
        </Link>
      </main>
    );
  }

  const ad = (uid: string | undefined) => (uid ? adlar[uid] ?? "?" : "boş");
  const benimSiram = oyun.status === "active" && koltuk === oyun.turn;
  const cekebilir = benimSiram && oyun.phase === "draw" && !isleniyor;
  const atabilir = benimSiram && oyun.phase === "discard" && !isleniyor;
  const onceki = koltuk >= 0 ? (koltuk + 3) % 4 : -1;
  const ustTas = (k: number) => {
    const y = oyun.discards[String(k)] ?? [];
    return y.length > 0 ? y[y.length - 1] : null;
  };

  const rakipler =
    koltuk >= 0
      ? [1, 2, 3].map((d) => (koltuk + d) % 4)
      : [0, 1, 2, 3];

  function rakipKarti(k: number) {
    const sahip = oyun!.players[k];
    const sirada = oyun!.status === "active" && oyun!.turn === k;
    const top = ustTas(k);
    const alinabilir = cekebilir && k === onceki && top !== null;
    const adet = 14 + (sirada && oyun!.phase === "discard" ? 1 : 0);
    return (
      <div
        key={k}
        className={`flex-1 space-y-1 rounded-2xl border bg-card p-2 text-center ${
          sirada ? "border-brand" : "border-line"
        }`}
      >
        <p className="truncate text-xs font-bold">@{ad(sahip)}</p>
        <p className="text-[10px] text-muted">
          {oyun!.status === "active" ? `${adet} taş` : ""}
          {sirada && ` · ⏱ ${kalanSn}`}
        </p>
        <div className="flex min-h-11 justify-center">
          {top !== null ? (
            <OkeyTasi id={top} ok={ok} kucuk />
          ) : (
            <span className="text-xs text-muted">—</span>
          )}
        </div>
        {alinabilir && (
          <button
            onClick={() => rpc("okey_cek", { gid: oyun!.id, kaynak: "atik" })}
            className="btn-brand w-full rounded-lg py-1 text-xs font-semibold"
          >
            Al
          </button>
        )}
      </div>
    );
  }

  let durum = "";
  if (oyun.status === "waiting") durum = `⏳ Oyuncular bekleniyor (${oyun.players.length}/4)`;
  else if (oyun.status === "active")
    durum = benimSiram
      ? oyun.phase === "draw"
        ? "Sıra sende: istiften ya da soldaki oyuncunun attığından taş çek"
        : "Sıra sende: bir taş seçip at (eli bitiyorsa Bitir)"
      : `Sıra: @${ad(oyun.players[oyun.turn])}`;
  else if (oyun.winner_id) durum = `🏆 @${ad(oyun.winner_id)} kazandı`;
  else durum = `🏁 Oyun bitti (${oyun.end_reason ?? ""})`;

  return (
    <main className="mx-auto max-w-lg space-y-3 p-3">
      <Link href="/oyunlar/okey" className="text-sm text-muted hover:text-ink">
        ← Okey lobisi
      </Link>

      <div
        className={`rounded-2xl border bg-card p-3 text-center text-sm font-semibold ${
          benimSiram ? "border-brand text-brand" : "border-line"
        }`}
      >
        {durum}
        {benimSiram && ` · ⏱ ${kalanSn} sn`}
      </div>

      {hata && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}

      {oyun.status === "waiting" && (
        <div className="space-y-3 rounded-3xl border border-line bg-card p-4">
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((k) => (
              <div
                key={k}
                className="rounded-2xl bg-card2 p-3 text-center text-sm"
              >
                {oyun.players[k] ? `@${ad(oyun.players[k])}` : "🪑 boş koltuk"}
              </div>
            ))}
          </div>
          {oyun.is_private && koltuk >= 0 && (
            <div className="rounded-xl bg-card2 p-3 text-center">
              <p className="text-xs text-muted">Oda kodu</p>
              <p className="font-mono text-3xl font-extrabold tracking-[0.3em]">
                {oyun.invite_code}
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={linkKopyala}
              className="btn-brand rounded-xl px-4 py-2 text-sm font-semibold"
            >
              {kopyalandi ? "✓ Kopyalandı" : "🔗 Linki kopyala"}
            </button>
            {koltuk >= 0 && (
              <button
                onClick={ayril}
                className="rounded-xl bg-card2 px-4 py-2 text-sm text-red-400"
              >
                Odadan ayrıl
              </button>
            )}
            {koltuk < 0 && benimId && !oyun.is_private && (
              <button
                onClick={() => rpc("okey_katil", { gid: oyun.id })}
                disabled={isleniyor}
                className="btn-brand rounded-xl px-5 py-2 text-sm font-semibold"
              >
                Odaya katıl
              </button>
            )}
          </div>
        </div>
      )}

      {oyun.status !== "waiting" && (
        <div
          className="space-y-3 rounded-3xl border border-line p-3"
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(255,122,26,0.18), transparent 60%), #1a0f26",
          }}
        >
          <div className="flex gap-2">{rakipler.map((k) => rakipKarti(k))}</div>

          <div className="flex items-center justify-center gap-4 rounded-2xl bg-black/30 p-3 text-white">
            <button
              onClick={() => rpc("okey_cek", { gid: oyun.id, kaynak: "yigin" })}
              disabled={!cekebilir}
              className={`flex h-20 w-14 flex-col items-center justify-center rounded-xl border-2 text-xs font-bold ${
                cekebilir
                  ? "border-brand bg-card2"
                  : "border-line bg-card opacity-70"
              }`}
            >
              <span className="text-xl">🦇</span>
              {oyun.pile_count}
              <span className="text-[9px] font-normal">İstif</span>
            </button>
            <div className="text-center">
              <p className="mb-1 text-[10px] opacity-80">Gösterge</p>
              {oyun.indicator !== null && (
                <OkeyTasi id={oyun.indicator} ok={null} />
              )}
              {ok && (
                <p className="mt-1 text-[11px] opacity-90">
                  Okey: {RENK_AD[ok.renk]} {ok.sayi} ★
                </p>
              )}
            </div>
          </div>

          {koltuk >= 0 && (
            <div className="space-y-2 rounded-2xl bg-black/30 p-2">
              <div className="flex items-center justify-between text-xs text-white/80">
                <span>
                  Senin attığın:{" "}
                  {ustTas(koltuk) === null ? "—" : ""}
                </span>
                {ustTas(koltuk) !== null && (
                  <OkeyTasi id={ustTas(koltuk) as number} ok={ok} kucuk />
                )}
              </div>

              <div className="flex flex-wrap justify-center gap-1.5 py-1">
                {sira.map((t) => (
                  <OkeyTasi
                    key={t}
                    id={t}
                    ok={ok}
                    secili={secili === t}
                    onClick={() => setSecili(secili === t ? null : t)}
                  />
                ))}
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setSira(renkSirala(sira))}
                  className="rounded-lg bg-card2 px-3 py-1.5 text-xs"
                >
                  Renge göre diz
                </button>
                <button
                  onClick={() => setSira(sayiSirala(sira))}
                  className="rounded-lg bg-card2 px-3 py-1.5 text-xs"
                >
                  Sayıya göre diz
                </button>
              </div>

              {oyun.status === "active" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (secili !== null) {
                        const t = secili;
                        setSecili(null);
                        rpc("okey_at", { gid: oyun.id, tas: t });
                      }
                    }}
                    disabled={!atabilir || secili === null}
                    className="btn-brand flex-1 rounded-xl py-3 text-sm font-semibold"
                  >
                    Seçili taşı at
                  </button>
                  <button
                    onClick={bitir}
                    disabled={!atabilir || sira.length !== 15}
                    className="flex-1 rounded-xl border-2 border-brand bg-card2 py-3 text-sm font-semibold text-brand disabled:opacity-40"
                  >
                    🏁 Bitir
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {oyun.status === "finished" && (
        <div className="space-y-3 rounded-3xl border border-line bg-card p-4">
          {oyun.win_groups && (
            <div className="space-y-2">
              <p className="text-sm font-bold">
                🏆 @{ad(oyun.winner_id ?? undefined)} elini böyle bitirdi:
              </p>
              {oyun.win_groups.map((g, i) => (
                <div key={i} className="flex flex-wrap gap-1">
                  {g.map((t) => (
                    <OkeyTasi key={t} id={t} ok={ok} kucuk />
                  ))}
                </div>
              ))}
            </div>
          )}
          {eller.length > 1 && (
            <div className="space-y-2">
              <p className="text-sm font-bold">Eller</p>
              {eller.map((e) => (
                <div key={e.user_id}>
                  <p className="text-xs text-muted">@{ad(e.user_id)}</p>
                  <div className="flex flex-wrap gap-1">
                    {sayiSirala(e.tiles).map((t) => (
                      <OkeyTasi key={t} id={t} ok={ok} kucuk />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link
            href="/oyunlar/okey"
            className="btn-brand block rounded-2xl p-3 text-center font-semibold"
          >
            Yeni oyun için lobiye dön
          </Link>
        </div>
      )}
    </main>
  );
}