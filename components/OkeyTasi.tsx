"use client";

import { Ok, RENKLER, jokerMi, tasBilgi } from "../lib/okey";

export default function OkeyTasi({
  id,
  ok,
  secili = false,
  kucuk = false,
  onClick,
}: {
  id: number;
  ok: Ok | null;
  secili?: boolean;
  kucuk?: boolean;
  onClick?: () => void;
}) {
  const t = tasBilgi(id);
  const joker = !!ok && jokerMi(id, ok);
  const boyut = kucuk ? "h-11 w-8 text-base" : "h-14 w-10 text-xl";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`relative flex shrink-0 flex-col items-center justify-center rounded-lg border-2 font-extrabold shadow transition ${boyut} ${
        secili ? "-translate-y-2 border-brand" : "border-[#d6c9a8]"
      }`}
      style={{
        background: "#fdf6e3",
        color: t.sahte ? "#7c3aed" : RENKLER[t.renk],
      }}
      aria-label={t.sahte ? "Sahte okey" : `${t.renk}-${t.sayi}`}
    >
      {t.sahte ? (
        <span className="text-lg">🎃</span>
      ) : (
        <>
          <span className="leading-none">{t.sayi}</span>
          <span className="text-[8px] leading-none">●</span>
        </>
      )}
      {joker && (
        <span className="absolute -right-1 -top-1 text-[10px] text-yellow-500">
          ★
        </span>
      )}
    </button>
  );
}