export type Sticker = { id: string; emoji: string; yazi: string; renk: string };

export const STICKERLAR: Sticker[] = [
  { id: "kalp", emoji: "💖", yazi: "Aşkım", renk: "linear-gradient(135deg,#ff2d87,#ff8ac0)" },
  { id: "alkis", emoji: "👏", yazi: "Bravo!", renk: "linear-gradient(135deg,#f59e0b,#fde047)" },
  { id: "ates", emoji: "🔥", yazi: "Yandı!", renk: "linear-gradient(135deg,#ef4444,#f97316)" },
  { id: "aglama", emoji: "😭", yazi: "Ağlıyorum", renk: "linear-gradient(135deg,#3b82f6,#67e8f9)" },
  { id: "sok", emoji: "😱", yazi: "Şok!", renk: "linear-gradient(135deg,#8b5cf6,#c084fc)" },
  { id: "gulme", emoji: "😂", yazi: "Öldüm", renk: "linear-gradient(135deg,#eab308,#fde047)" },
  { id: "yildiz", emoji: "🌟", yazi: "Yıldız", renk: "linear-gradient(135deg,#6366f1,#a78bfa)" },
  { id: "mikrofon", emoji: "🎤", yazi: "Sahne senin", renk: "linear-gradient(135deg,#ec4899,#8b5cf6)" },
  { id: "muzik", emoji: "🎵", yazi: "Döngüde", renk: "linear-gradient(135deg,#10b981,#34d399)" },
  { id: "kral", emoji: "👑", yazi: "Kraliçe/Kral", renk: "linear-gradient(135deg,#f59e0b,#b45309)" },
  { id: "sevgi", emoji: "🥰", yazi: "Bayıldım", renk: "linear-gradient(135deg,#f472b6,#fb7185)" },
  { id: "dusun", emoji: "🤔", yazi: "Hmm", renk: "linear-gradient(135deg,#64748b,#94a3b8)" },
  { id: "tebrik", emoji: "🎉", yazi: "Tebrikler", renk: "linear-gradient(135deg,#f97316,#ec4899)" },
  { id: "uyku", emoji: "😴", yazi: "Sıkıldım", renk: "linear-gradient(135deg,#475569,#64748b)" },
  { id: "kabak", emoji: "🎃", yazi: "Cadılar Bayramı", renk: "linear-gradient(135deg,#ea580c,#7c3aed)" },
  { id: "hayalet", emoji: "👻", yazi: "Buu!", renk: "linear-gradient(135deg,#334155,#7c3aed)" },
];

export function stickerBul(id: string) {
  return STICKERLAR.find((s) => s.id === id) ?? null;
}