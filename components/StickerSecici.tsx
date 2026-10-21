"use client";

import { STICKERLAR, Sticker } from "../lib/stickers";

export function StickerGorsel({ s }: { s: Sticker }) {
  return (
    <span
      className="inline-flex flex-col items-center rounded-2xl px-4 py-2 text-white shadow"
      style={{ background: s.renk }}
    >
      <span className="text-5xl leading-none">{s.emoji}</span>
      <span className="mt-1 text-xs font-extrabold">{s.yazi}</span>
    </span>
  );
}

export default function StickerSecici({ onSec }: { onSec: (id: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2 rounded-2xl border border-line bg-card2 p-2">
      {STICKERLAR.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSec(s.id)}
          className="rounded-xl p-1 transition hover:scale-105"
          aria-label={s.yazi}
        >
          <StickerGorsel s={s} />
        </button>
      ))}
    </div>
  );
}