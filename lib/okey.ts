export const RENKLER = ["#dc2626", "#d97706", "#2563eb", "#0f172a"];
export const RENK_AD = ["Kırmızı", "Sarı", "Mavi", "Siyah"];

export type Ok = { renk: number; sayi: number };

export function tasBilgi(id: number) {
  if (id >= 104) return { sahte: true, renk: -1, sayi: 0 };
  return { sahte: false, renk: Math.floor(id / 26), sayi: (id % 13) + 1 };
}

// Göstergenin bir fazlası okey taşıdır (13'ün fazlası 1)
export function okeyBul(gosterge: number): Ok {
  const renk = Math.floor(gosterge / 26);
  const n = (gosterge % 13) + 1;
  return { renk, sayi: (n % 13) + 1 };
}

export function jokerMi(id: number, ok: Ok) {
  if (id >= 104) return false;
  const t = tasBilgi(id);
  return t.renk === ok.renk && t.sayi === ok.sayi;
}

// Sunucudaki okey_grup_gecerli ile aynı kural
export function grupGecerli(ids: number[], ok: Ok): boolean {
  const n = ids.length;
  if (n < 3 || n > 13) return false;
  const sayilar: number[] = [];
  const renkler: number[] = [];
  for (const id of ids) {
    if (id >= 104) {
      sayilar.push(ok.sayi);
      renkler.push(ok.renk);
      continue;
    }
    const t = tasBilgi(id);
    if (t.renk === ok.renk && t.sayi === ok.sayi) continue;
    sayilar.push(t.sayi);
    renkler.push(t.renk);
  }
  if (sayilar.length === 0) return true;
  const renkSet = new Set(renkler);
  if (n <= 4 && new Set(sayilar).size === 1 && renkSet.size === renkler.length) {
    return true;
  }
  if (renkSet.size === 1) {
    for (const opt of [0, 1]) {
      const arr = sayilar.map((v) => (opt === 1 && v === 1 ? 14 : v));
      if (new Set(arr).size !== arr.length) continue;
      const mn = Math.min(...arr);
      const mx = Math.max(...arr);
      const lo = Math.max(1, mx - n + 1);
      const hi = Math.min(mn, 15 - n);
      if (lo <= hi) return true;
    }
  }
  return false;
}

function bitSayisi(m: number) {
  let c = 0;
  while (m) {
    c += m & 1;
    m >>>= 1;
  }
  return c;
}

// 15 taşlık elden, bir taş atıp kalan 14'ü perlere ayırmayı dener
export function bitisBul(
  el: number[],
  ok: Ok,
  tercih?: number
): { atilan: number; gruplar: number[][] } | null {
  const n = el.length;
  if (n !== 15) return null;
  const tam = (1 << n) - 1;
  const byLow: number[][] = Array.from({ length: n }, () => []);

  for (let m = 1; m <= tam; m++) {
    const pc = bitSayisi(m);
    if (pc < 3 || pc > 13) continue;
    const ids: number[] = [];
    for (let i = 0; i < n; i++) if (m & (1 << i)) ids.push(el[i]);
    if (grupGecerli(ids, ok)) byLow[31 - Math.clz32(m & -m)].push(m);
  }

  const adaylar = Array.from({ length: n }, (_, i) => i);
  if (tercih !== undefined) {
    const i = el.indexOf(tercih);
    if (i > 0) {
      adaylar.splice(i, 1);
      adaylar.unshift(i);
    }
  }

  for (const aday of adaylar) {
    const memo = new Map<number, number[] | null>();
    const f = (mask: number): number[] | null => {
      if (mask === 0) return [];
      if (memo.has(mask)) return memo.get(mask)!;
      const b = 31 - Math.clz32(mask & -mask);
      for (const m of byLow[b]) {
        if ((m & ~mask) !== 0) continue;
        const r = f(mask ^ m);
        if (r) {
          const s = [m, ...r];
          memo.set(mask, s);
          return s;
        }
      }
      memo.set(mask, null);
      return null;
    };
    const s = f(tam ^ (1 << aday));
    if (s) {
      return {
        atilan: el[aday],
        gruplar: s.map((m) => el.filter((_, i) => (m & (1 << i)) !== 0)),
      };
    }
  }
  return null;
}

export function renkSirala(el: number[]) {
  const anahtar = (id: number) =>
    id >= 104 ? 1000 : tasBilgi(id).renk * 20 + tasBilgi(id).sayi;
  return [...el].sort((a, b) => anahtar(a) - anahtar(b) || a - b);
}

export function sayiSirala(el: number[]) {
  const anahtar = (id: number) =>
    id >= 104 ? 1000 : tasBilgi(id).sayi * 10 + tasBilgi(id).renk;
  return [...el].sort((a, b) => anahtar(a) - anahtar(b) || a - b);
}