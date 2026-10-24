"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "../lib/supabase";

// Rehber içeriğini değiştirip herkese yeniden göstermek istersen bu sayıyı artır
// (veritabanında da "tour_version" bundan küçük olanlara tekrar gösterilir)
const SURUM = 1;
const SERBEST = ["/giris", "/onay", "/belge", "/hesap-sil"];

type Adim = {
  ikon: string;
  baslik: string;
  metin: string;
  link?: string;
  linkEtiket?: string;
};

const ADIMLAR: Adim[] = [
  {
    ikon: "🎶",
    baslik: "Beat'e hoş geldin!",
    metin:
      "Burası yeni nesil boyband, girlband ve solo sanatçı hayranlarının buluşma noktası. 1 dakikada neler yapabileceğini gösterelim.",
  },
  {
    ikon: "💬",
    baslik: "Akış ve gönderiler",
    metin:
      "Ana sayfada herkesin paylaşımları var. Yazı, 4'e kadar fotoğraf, #etiket ve @kişi ekleyebilirsin. Gönderilere 🔥😭💖 gibi tepki ver, yorum yaz, sticker gönder, alıntıla.",
    link: "/",
    linkEtiket: "Ana sayfaya git",
  },
  {
    ikon: "🎤",
    baslik: "Gruplar ve takip",
    metin:
      "Sevdiğin grupları takip et, \"Takip ettiklerim\" sekmesinde sadece onların gelişmelerini gör. Kişileri de takip edebilirsin.",
    link: "/gruplar",
    linkEtiket: "Grupları keşfet",
  },
  {
    ikon: "✨",
    baslik: "Profilini özgünleştir",
    metin:
      "Bias'ını, favori grubunu ve şarkını ekle. Ana sayfanın üstündeki Notlar'a 24 saatlik bir not bırak, istersen TR pop şarkısı ekle.",
    link: "/",
    linkEtiket: "Not bırak",
  },
  {
    ikon: "🎯",
    baslik: "Görevler, puan ve seri",
    metin:
      "Görevleri tamamla, çerçeve, tema ve ünvan kazan. Her gün gir, serini büyüt. Gönderi ve yorum yapınca da puan kazanırsın. Liderlik tablosunda yerini gör.",
    link: "/gorevler",
    linkEtiket: "Görevlere bak",
  },
  {
    ikon: "📅",
    baslik: "Etkinlik, anket ve günün artisti",
    metin:
      "Konser ve buluşma planla, anket aç, günün artistine oy ver. Hepsini herkes yapabilir.",
    link: "/etkinlikler",
    linkEtiket: "Etkinliklere git",
  },
  {
    ikon: "🎮",
    baslik: "Oyunlar ve videolar",
    metin:
      "Satranç ve 4 kişilik Okey oyna. Kaydırmalı videolara göz at, kendi videonu yükle.",
    link: "/oyunlar",
    linkEtiket: "Oyunlara git",
  },
  {
    ikon: "🛡️",
    baslik: "Güvenli kal",
    metin:
      "Rahatsız eden içerik için ⚑ ile şikayet et, kişileri engelle ya da sessize al. Bu rehberi istediğin zaman üstteki ❓ düğmesinden (telefonda ☰ menüsünden) tekrar açabilirsin.",
  },
];

export default function RehberTuru() {
  const supabase = createClient();
  const yol = usePathname();
  const [acik, setAcik] = useState(false);
  const [adim, setAdim] = useState(0);
  const kontrolEdildi = useRef(false);

  async function goruldu() {
    const { data: k } = await supabase.auth.getUser();
    if (!k.user) return;
    await supabase
      .from("profiles")
      .update({ tour_version: SURUM })
      .eq("id", k.user.id)
      .lt("tour_version", SURUM);
  }

  function kapat() {
    setAcik(false);
    goruldu();
  }

  // İlk açılış: giriş yapmış, belgeleri onaylamış, rehberi görmemiş kullanıcı
  useEffect(() => {
    if (kontrolEdildi.current) return;
    if (SERBEST.some((s) => yol.startsWith(s))) return;
    let iptal = false;
    (async () => {
      const { data: k } = await supabase.auth.getUser();
      if (!k.user || iptal) return;
      const { data: onay } = await supabase.rpc("onay_durumu");
      if (onay !== true || iptal) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("tour_version")
        .eq("id", k.user.id)
        .maybeSingle();
      if (iptal) return;
      kontrolEdildi.current = true;
      if (p && (p.tour_version ?? 0) < SURUM) {
        setAdim(0);
        setAcik(true);
      }
    })();
    return () => {
      iptal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yol]);

  // Hesap değişince yeniden kontrol edilsin
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      kontrolEdildi.current = false;
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Menüdeki ❓ düğmesi
  useEffect(() => {
    function ac() {
      setAdim(0);
      setAcik(true);
    }
    window.addEventListener("rehber-ac", ac);
    return () => window.removeEventListener("rehber-ac", ac);
  }, []);

  if (!acik) return null;
  const a = ADIMLAR[adim];
  const son = adim === ADIMLAR.length - 1;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-3 sm:items-center"
      onClick={kapat}
    >
      <div
        className="w-full max-w-md space-y-4 rounded-3xl border border-line bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted">
            {adim + 1} / {ADIMLAR.length}
          </span>
          <button
            onClick={kapat}
            className="text-sm text-muted hover:text-ink"
          >
            Atla ✕
          </button>
        </div>

        <div className="space-y-2 text-center">
          <p className="text-6xl">{a.ikon}</p>
          <h2 className="text-xl font-extrabold">{a.baslik}</h2>
          <p className="text-sm text-muted">{a.metin}</p>
        </div>

        {a.link && (
          <Link
            href={a.link}
            onClick={kapat}
            className="block rounded-xl bg-card2 p-3 text-center text-sm font-semibold text-brand hover:opacity-80"
          >
            {a.linkEtiket} →
          </Link>
        )}

        <div className="flex justify-center gap-1.5">
          {ADIMLAR.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === adim ? "btn-brand w-6" : "w-1.5 bg-card2"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {adim > 0 && (
            <button
              onClick={() => setAdim(adim - 1)}
              className="rounded-xl bg-card2 px-5 py-3 text-sm font-semibold"
            >
              Geri
            </button>
          )}
          <button
            onClick={() => (son ? kapat() : setAdim(adim + 1))}
            className="btn-brand flex-1 rounded-xl py-3 text-sm font-semibold"
          >
            {son ? "Başlayalım! 🚀" : "İleri"}
          </button>
        </div>
      </div>
    </div>
  );
}