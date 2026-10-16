export type Cerceve = {
  id: string;
  ad: string;
  arka: string;
  golge?: string;
};

export const CERCEVELER: Cerceve[] = [
  { id: "gul", ad: "Gül Pembesi", arka: "linear-gradient(135deg,#f9a8d4,#ec4899)" },
  {
    id: "yildiz",
    ad: "Yıldız Tozu",
    arka: "linear-gradient(135deg,#fde047,#f59e0b,#fde047)",
    golge: "0 0 10px rgba(253,224,71,0.55)",
  },
  {
    id: "alev",
    ad: "Alev",
    arka: "linear-gradient(135deg,#ef4444,#f97316,#fde047)",
    golge: "0 0 10px rgba(249,115,22,0.55)",
  },
  {
    id: "neon",
    ad: "Neon",
    arka: "linear-gradient(135deg,#22d3ee,#a855f7)",
    golge: "0 0 12px rgba(168,85,247,0.7)",
  },
  {
    id: "elmas",
    ad: "Elmas",
    arka: "linear-gradient(135deg,#ffffff,#67e8f9,#ffffff)",
    golge: "0 0 12px rgba(103,232,249,0.8)",
  },
  {
    id: "gokkusagi",
    ad: "Gökkuşağı",
    arka: "linear-gradient(135deg,#f43f5e,#f59e0b,#22c55e,#3b82f6,#a855f7)",
    golge: "0 0 10px rgba(168,85,247,0.5)",
  },
  {
    id: "buz",
    ad: "Buz",
    arka: "linear-gradient(135deg,#e0f2fe,#38bdf8)",
    golge: "0 0 10px rgba(56,189,248,0.6)",
  },
];

export type Tema = {
  id: string;
  ad: string;
  banner: string;
  sayfa: string;
  ucretsiz: boolean;
};

export const TEMALAR: Tema[] = [
  {
    id: "beat",
    ad: "Beat",
    banner: "linear-gradient(135deg,#ff2d87,#8b5cf6)",
    sayfa:
      "radial-gradient(ellipse at top, rgba(255,45,135,0.22), transparent 55%), radial-gradient(ellipse at bottom right, rgba(139,92,246,0.18), transparent 55%)",
    ucretsiz: true,
  },
  {
    id: "gece",
    ad: "Gece",
    banner: "linear-gradient(135deg,#0f172a,#1e3a8a)",
    sayfa:
      "radial-gradient(ellipse at top, rgba(59,130,246,0.25), transparent 55%), radial-gradient(ellipse at bottom left, rgba(30,58,138,0.25), transparent 55%)",
    ucretsiz: true,
  },
  {
    id: "okyanus",
    ad: "Okyanus",
    banner: "linear-gradient(135deg,#06b6d4,#3b82f6)",
    sayfa:
      "radial-gradient(ellipse at top, rgba(6,182,212,0.25), transparent 55%), radial-gradient(ellipse at bottom right, rgba(59,130,246,0.2), transparent 55%)",
    ucretsiz: true,
  },
  {
    id: "gunbatimi",
    ad: "Gün Batımı",
    banner: "linear-gradient(135deg,#f97316,#ec4899)",
    sayfa:
      "radial-gradient(ellipse at top, rgba(249,115,22,0.25), transparent 55%), radial-gradient(ellipse at bottom right, rgba(236,72,153,0.2), transparent 55%)",
    ucretsiz: false,
  },
  {
    id: "orman",
    ad: "Orman",
    banner: "linear-gradient(135deg,#16a34a,#065f46)",
    sayfa:
      "radial-gradient(ellipse at top, rgba(34,197,94,0.22), transparent 55%), radial-gradient(ellipse at bottom left, rgba(6,95,70,0.25), transparent 55%)",
    ucretsiz: false,
  },
  {
    id: "altin",
    ad: "Altın",
    banner: "linear-gradient(135deg,#f59e0b,#b45309)",
    sayfa:
      "radial-gradient(ellipse at top, rgba(245,158,11,0.28), transparent 55%), radial-gradient(ellipse at bottom right, rgba(180,83,9,0.22), transparent 55%)",
    ucretsiz: false,
  },
  {
    id: "sakura",
    ad: "Sakura",
    banner: "linear-gradient(135deg,#fbcfe8,#f472b6)",
    sayfa:
      "radial-gradient(ellipse at top, rgba(244,114,182,0.25), transparent 55%), radial-gradient(ellipse at bottom left, rgba(251,207,232,0.2), transparent 55%)",
    ucretsiz: false,
  },
  {
    id: "neon",
    ad: "Neon",
    banner: "linear-gradient(135deg,#22c55e,#7c3aed)",
    sayfa:
      "radial-gradient(ellipse at top, rgba(34,197,94,0.22), transparent 55%), radial-gradient(ellipse at bottom right, rgba(124,58,237,0.25), transparent 55%)",
    ucretsiz: false,
  },
];

export function cerceveBul(id?: string | null): Cerceve | null {
  if (!id) return null;
  return CERCEVELER.find((c) => c.id === id) ?? null;
}

export function temaBul(id?: string | null): Tema {
  return TEMALAR.find((t) => t.id === id) ?? TEMALAR[0];
}