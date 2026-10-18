"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import BelgeMetni from "../../components/BelgeMetni";
import { BELGELER, BELGE_SURUMU, Belge } from "../../lib/belgeler";

function Kutu({
  belge,
  okundu,
  onOku,
}: {
  belge: Belge;
  okundu: boolean;
  onOku: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function kontrol() {
    const el = ref.current;
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 8) onOku();
  }

  useEffect(() => {
    kontrol();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="space-y-2 rounded-3xl border border-line bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">{belge.baslik}</h2>
        <span
          className={`rounded-full bg-card2 px-3 py-1 text-xs font-semibold ${
            okundu ? "text-green-500" : "text-muted"
          }`}
        >
          {okundu ? "✓ Okundu" : "Sonuna kadar kaydır"}
        </span>
      </div>
      <div
        ref={ref}
        onScroll={kontrol}
        className="max-h-64 overflow-y-auto rounded-2xl bg-card2 p-3"
      >
        <BelgeMetni belge={belge} />
      </div>
    </section>
  );
}

export default function OnaySayfasi() {
  const supabase = createClient();
  const router = useRouter();
  const [girisVar, setGirisVar] = useState(true);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [okundu, setOkundu] = useState<Record<string, boolean>>({});
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const [c, setC] = useState(false);
  const [islem, setIslem] = useState(false);
  const [hata, setHata] = useState("");

  useEffect(() => {
    async function baslat() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setGirisVar(false);
        setYukleniyor(false);
        return;
      }
      const { data: ok, error } = await supabase.rpc("onay_durumu");
      if (!error && ok === true) {
        router.replace("/");
        return;
      }
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hepsiOkundu = BELGELER.every((x) => okundu[x.id]);

  async function onayla() {
    if (islem || !a || !b || !c) return;
    setHata("");
    setIslem(true);
    const { error } = await supabase.rpc("onay_ver", { surum: BELGE_SURUMU });
    if (error) {
      setHata(error.message);
      setIslem(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  async function cikis() {
    await supabase.auth.signOut();
    window.location.href = "/";
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
        <p className="text-4xl">📄</p>
        <p className="text-muted">Önce giriş yapmalısın.</p>
        <Link href="/giris" className="text-brand hover:underline">
          Giriş yap
        </Link>
      </main>
    );
  }

  const kutu = (acik: boolean) =>
    `flex items-start gap-3 rounded-2xl bg-card2 p-3 text-sm ${
      acik ? "" : "opacity-50"
    }`;

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <section className="btn-brand rounded-3xl p-6">
        <h2 className="text-2xl font-extrabold">📄 Devam etmeden önce</h2>
        <p className="mt-1 text-sm opacity-90">
          Aşağıdaki belgeleri okuyup onaylaman gerekiyor. Her belgeyi sonuna
          kadar kaydırınca onay kutuları açılır.
        </p>
      </section>

      {BELGELER.map((x) => (
        <Kutu
          key={x.id}
          belge={x}
          okundu={!!okundu[x.id]}
          onOku={() =>
            setOkundu((o) => (o[x.id] ? o : { ...o, [x.id]: true }))
          }
        />
      ))}

      <section className="space-y-2 rounded-3xl border border-line bg-card p-4">
        <label className={kutu(hepsiOkundu)}>
          <input
            type="checkbox"
            disabled={!hepsiOkundu}
            checked={a}
            onChange={(e) => setA(e.target.checked)}
            className="mt-0.5 h-5 w-5"
          />
          <span>
            <b>Kullanım Şartları</b> ve <b>Topluluk Kuralları</b>&apos;nı
            okudum, kabul ediyorum.
          </span>
        </label>
        <label className={kutu(hepsiOkundu)}>
          <input
            type="checkbox"
            disabled={!hepsiOkundu}
            checked={b}
            onChange={(e) => setB(e.target.checked)}
            className="mt-0.5 h-5 w-5"
          />
          <span>
            <b>Gizlilik Politikası</b> ve <b>KVKK Aydınlatma Metni</b>&apos;ni
            okudum, bilgilendirildim.
          </span>
        </label>
        <label className={kutu(hepsiOkundu)}>
          <input
            type="checkbox"
            disabled={!hepsiOkundu}
            checked={c}
            onChange={(e) => setC(e.target.checked)}
            className="mt-0.5 h-5 w-5"
          />
          <span>
            En az 13 yaşındayım. 18 yaşından küçüksem velimin ya da yasal
            temsilcimin bilgisi ve onayı var.
          </span>
        </label>

        {hata && <p className="text-sm text-yellow-500">{hata}</p>}

        <button
          onClick={onayla}
          disabled={!a || !b || !c || islem}
          className="btn-brand w-full rounded-xl p-3 font-semibold"
        >
          {islem ? "Kaydediliyor..." : "Onayla ve devam et"}
        </button>
        <button
          onClick={cikis}
          className="w-full text-sm text-muted hover:text-ink"
        >
          Onaylamıyorum, çıkış yap
        </button>
        <p className="text-xs text-muted">
          Onaylamazsan siteyi gezebilirsin ama paylaşım, yorum, tepki ve oyun
          gibi işlemleri yapamazsın.
        </p>
      </section>
    </main>
  );
}