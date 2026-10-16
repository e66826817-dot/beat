"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Chess, Square } from "chess.js";
import { createClient } from "../../../../lib/supabase";
import { hataCevir } from "../../../../components/PostCard";

type Oyun = {
  id: string;
  creator_id: string;
  white_id: string | null;
  black_id: string | null;
  status: "waiting" | "active" | "finished";
  fen: string;
  pgn: string;
  turn: "w" | "b";
  move_count: number;
  result: "white" | "black" | "draw" | null;
  end_reason: string | null;
  last_move: string | null;
  draw_offer_by: string | null;
  white: { username: string } | null;
  black: { username: string } | null;
};

const SORGU =
  "id, creator_id, white_id, black_id, status, fen, pgn, turn, move_count, result, end_reason, last_move, draw_offer_by, white:profiles!chess_games_white_id_fkey(username), black:profiles!chess_games_black_id_fkey(username)";

const PARCA: Record<string, string> = {
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};
const DOSYA = ["a", "b", "c", "d", "e", "f", "g", "h"];

export default function SatrancOyunu() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [oyun, setOyun] = useState<Oyun | null>(null);
  const [benimId, setBenimId] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [bulunamadi, setBulunamadi] = useState(false);
  const [hata, setHata] = useState("");
  const [secili, setSecili] = useState<Square | null>(null);
  const [terfi, setTerfi] = useState<{ from: Square; to: Square } | null>(null);
  const [isleniyor, setIsleniyor] = useState(false);
  const [kopyalandi, setKopyalandi] = useState(false);
  const durumRef = useRef<string>("");

  async function getir() {
    const { data, error } = await supabase
      .from("chess_games")
      .select(SORGU)
      .eq("id", id)
      .maybeSingle();
    if (error) {
      setHata(error.message);
      return;
    }
    if (!data) {
      setBulunamadi(true);
      return;
    }
    const o = data as unknown as Oyun;
    durumRef.current = o.status;
    setOyun(o);
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
      }, 2500);
    }
    baslat();
    return () => {
      if (sayac) clearInterval(sayac);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const satranc = useMemo(() => {
    const c = new Chess();
    if (oyun?.pgn) {
      try {
        c.loadPgn(oyun.pgn);
      } catch {
        /* geçersiz kayıt yoksayılır */
      }
    }
    return c;
  }, [oyun?.pgn]);

  const renk: "w" | "b" | null =
    oyun && benimId
      ? benimId === oyun.white_id
        ? "w"
        : benimId === oyun.black_id
        ? "b"
        : null
      : null;

  const sirabende =
    !!oyun && oyun.status === "active" && !!renk && oyun.turn === renk;

  const hamleler = secili ? satranc.moves({ square: secili, verbose: true }) : [];

  async function hamleYap(from: Square, to: Square, terfiTasi?: string) {
    if (!oyun || !renk) return;
    const c = new Chess();
    if (oyun.pgn) c.loadPgn(oyun.pgn);
    let san = "";
    try {
      const m = c.move({ from, to, promotion: terfiTasi });
      san = m.san;
    } catch {
      setHata("Geçersiz hamle.");
      setSecili(null);
      return;
    }
    const bitti = c.isGameOver();
    let sonuc: string | null = null;
    let sebep: string | null = null;
    if (bitti) {
      if (c.isCheckmate()) {
        sonuc = renk === "w" ? "white" : "black";
        sebep = "şah mat";
      } else {
        sonuc = "draw";
        sebep = c.isStalemate()
          ? "pat"
          : c.isInsufficientMaterial()
          ? "yetersiz materyal"
          : c.isThreefoldRepetition()
          ? "üç kez tekrar"
          : "elli hamle kuralı";
      }
    }
    setHata("");
    setIsleniyor(true);
    const { error } = await supabase.rpc("satranc_hamle", {
      gid: oyun.id,
      yeni_fen: c.fen(),
      yeni_pgn: c.pgn(),
      sayi: c.history().length,
      son_hamle: san,
      bitti,
      sonuc,
      sebep,
    });
    setSecili(null);
    setTerfi(null);
    if (error) setHata(hataCevir(error.message));
    await getir();
    setIsleniyor(false);
  }

  function tikla(kare: Square) {
    if (!sirabende || isleniyor) return;
    if (secili) {
      const hamle = hamleler.find((h) => h.to === kare);
      if (hamle) {
        if (hamle.flags.includes("p")) {
          setTerfi({ from: secili, to: kare });
          return;
        }
        hamleYap(secili, kare);
        return;
      }
    }
    const tas = satranc.get(kare);
    if (tas && tas.color === renk) setSecili(kare);
    else setSecili(null);
  }

  async function rpc(ad: string, args: Record<string, unknown>) {
    setHata("");
    setIsleniyor(true);
    const { error } = await supabase.rpc(ad, args);
    if (error) setHata(hataCevir(error.message));
    await getir();
    setIsleniyor(false);
  }

  async function teslimOl() {
    if (!oyun) return;
    if (!window.confirm("Teslim olmak istediğine emin misin?")) return;
    await rpc("satranc_teslim", { gid: oyun.id });
  }

  async function iptalEt() {
    if (!oyun) return;
    const { error } = await supabase
      .from("chess_games")
      .delete()
      .eq("id", oyun.id);
    if (error) {
      setHata(hataCevir(error.message));
      return;
    }
    router.push("/oyunlar/satranc");
  }

  async function linkKopyala() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      setHata("Link kopyalanamadı: " + window.location.href);
    }
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-md space-y-3 p-4">
        <div className="aspect-square animate-pulse rounded-3xl border border-line bg-card" />
      </main>
    );
  }

  if (bulunamadi || !oyun) {
    return (
      <main className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
        <p className="text-4xl">♟️</p>
        <p className="text-muted">Bu oyun bulunamadı ya da iptal edildi.</p>
        <Link href="/oyunlar/satranc" className="text-brand hover:underline">
          Satranç lobisi
        </Link>
      </main>
    );
  }

  const asagidaki: "w" | "b" = renk ?? "w";
  const dosyalar = asagidaki === "b" ? [...DOSYA].reverse() : DOSYA;
  const siralar =
    asagidaki === "b" ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];

  const sonHamle = satranc.history({ verbose: true }).slice(-1)[0];

  let sahKare: string | null = null;
  if (oyun.status === "active" && satranc.inCheck()) {
    for (const f of DOSYA) {
      for (let r = 1; r <= 8; r++) {
        const t = satranc.get(`${f}${r}` as Square);
        if (t && t.type === "k" && t.color === satranc.turn()) sahKare = `${f}${r}`;
      }
    }
  }

  const beyazAd = oyun.white?.username ?? "bekleniyor";
  const siyahAd = oyun.black?.username ?? "bekleniyor";
  const ustRenk = asagidaki === "w" ? "b" : "w";
  const adGoster = (r: "w" | "b") =>
    `${r === "w" ? "⚪" : "⚫"} ${r === "w" ? beyazAd : siyahAd}`;

  const gecmis = satranc.history();
  const hamleCiftleri: string[] = [];
  for (let i = 0; i < gecmis.length; i += 2) {
    hamleCiftleri.push(
      `${i / 2 + 1}. ${gecmis[i]}${gecmis[i + 1] ? " " + gecmis[i + 1] : ""}`
    );
  }

  const katilimci = renk !== null;
  const teklifBende = oyun.draw_offer_by === benimId;
  const teklifRakipte = !!oyun.draw_offer_by && !teklifBende;

  let durumSatiri = "";
  if (oyun.status === "waiting") {
    durumSatiri = "⏳ Rakip bekleniyor...";
  } else if (oyun.status === "active") {
    const sira = oyun.turn === "w" ? beyazAd : siyahAd;
    durumSatiri = `${oyun.turn === "w" ? "⚪" : "⚫"} Sıra: ${sira}${
      satranc.inCheck() ? " · Şah!" : ""
    }`;
  } else if (oyun.result === "draw") {
    durumSatiri = `🤝 Berabere (${oyun.end_reason ?? ""})`;
  } else if (oyun.result) {
    const k = oyun.result === "white" ? beyazAd : siyahAd;
    durumSatiri = `🏆 ${k} kazandı (${oyun.end_reason ?? ""})`;
  } else {
    durumSatiri = `🏁 Oyun bitti (${oyun.end_reason ?? ""})`;
  }

  return (
    <main className="mx-auto max-w-md space-y-3 p-4">
      <Link href="/oyunlar/satranc" className="text-sm text-muted hover:text-ink">
        ← Satranç lobisi
      </Link>

      <div className="rounded-2xl border border-line bg-card px-4 py-2 text-sm font-semibold">
        {adGoster(ustRenk)}
      </div>

      <div className="grid w-full grid-cols-8 overflow-hidden rounded-2xl border border-line">
        {siralar.map((r) =>
          dosyalar.map((f) => {
            const kare = `${f}${r}` as Square;
            const fi = DOSYA.indexOf(f);
            const koyu = (fi + r) % 2 === 1;
            const tas = satranc.get(kare);
            const hedef = hamleler.find((h) => h.to === kare);
            const sonKare =
              !!sonHamle && (sonHamle.from === kare || sonHamle.to === kare);
            return (
              <button
                key={kare}
                onClick={() => tikla(kare)}
                className="relative flex aspect-square items-center justify-center"
                style={{ background: koyu ? "#b58863" : "#f0d9b5" }}
                aria-label={kare}
              >
                {sonKare && (
                  <span
                    className="absolute inset-0"
                    style={{ background: "rgba(255,220,0,0.35)" }}
                  />
                )}
                {secili === kare && (
                  <span
                    className="absolute inset-0"
                    style={{ background: "rgba(80,160,255,0.5)" }}
                  />
                )}
                {sahKare === kare && (
                  <span
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(255,0,0,0.7), transparent 70%)",
                    }}
                  />
                )}
                {f === dosyalar[0] && (
                  <span
                    className="absolute left-0.5 top-0 text-[9px] font-bold"
                    style={{ color: koyu ? "#f0d9b5" : "#b58863" }}
                  >
                    {r}
                  </span>
                )}
                {r === siralar[7] && (
                  <span
                    className="absolute bottom-0 right-0.5 text-[9px] font-bold"
                    style={{ color: koyu ? "#f0d9b5" : "#b58863" }}
                  >
                    {f}
                  </span>
                )}
                {tas && (
                  <span
                    className="relative select-none leading-none"
                    style={{
                      fontSize: "clamp(26px, 9.5vw, 46px)",
                      color: tas.color === "w" ? "#ffffff" : "#111111",
                      textShadow:
                        tas.color === "w"
                          ? "0 0 2px #000, 0 0 2px #000, 0 1px 3px #000"
                          : "0 0 2px rgba(255,255,255,0.6)",
                    }}
                  >
                    {PARCA[tas.type]}
                  </span>
                )}
                {hedef && (
                  <span
                    className="absolute rounded-full"
                    style={
                      tas
                        ? {
                            inset: "4%",
                            border: "3px solid rgba(20,120,20,0.7)",
                          }
                        : {
                            width: "28%",
                            height: "28%",
                            background: "rgba(20,120,20,0.55)",
                          }
                    }
                  />
                )}
              </button>
            );
          })
        )}
      </div>

      <div className="rounded-2xl border border-line bg-card px-4 py-2 text-sm font-semibold">
        {adGoster(asagidaki)}
        {renk === null && (
          <span className="ml-2 text-xs font-normal text-muted">(izleyici)</span>
        )}
      </div>

      <div
        className={`rounded-2xl border bg-card p-3 text-center text-sm font-semibold ${
          sirabende ? "border-brand text-brand" : "border-line"
        }`}
      >
        {sirabende ? "Sıra sende! " : ""}
        {durumSatiri}
      </div>

      {terfi && (
        <div className="space-y-2 rounded-2xl border border-line bg-card p-3">
          <p className="text-sm font-semibold">Piyon terfisi: bir taş seç</p>
          <div className="flex gap-2">
            {(
              [
                ["q", "♛"],
                ["r", "♜"],
                ["b", "♝"],
                ["n", "♞"],
              ] as const
            ).map(([t, s]) => (
              <button
                key={t}
                onClick={() => hamleYap(terfi.from, terfi.to, t)}
                className="flex-1 rounded-xl bg-card2 py-2 text-3xl"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {hata && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}

      {oyun.status === "waiting" && (
        <div className="space-y-2 rounded-2xl border border-line bg-card p-3">
          <p className="text-sm text-muted">
            Linki arkadaşına gönder ya da lobide bekleyenler arasında görünsün.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={linkKopyala}
              className="btn-brand rounded-xl px-4 py-2 text-sm font-semibold"
            >
              {kopyalandi ? "✓ Kopyalandı" : "🔗 Linki kopyala"}
            </button>
            {benimId === oyun.creator_id && (
              <button
                onClick={iptalEt}
                className="rounded-xl bg-card2 px-4 py-2 text-sm text-red-400"
              >
                İptal et
              </button>
            )}
            {benimId && benimId !== oyun.creator_id && (
              <button
                onClick={() => rpc("satranc_katil", { gid: oyun.id })}
                disabled={isleniyor}
                className="btn-brand rounded-xl px-5 py-2 text-sm font-semibold"
              >
                Oyuna katıl
              </button>
            )}
          </div>
        </div>
      )}

      {oyun.status === "active" && katilimci && (
        <div className="space-y-2 rounded-2xl border border-line bg-card p-3">
          {teklifRakipte && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">🤝 Rakip beraberlik öneriyor.</span>
              <button
                onClick={() => rpc("satranc_beraberlik", { gid: oyun.id, eylem: "kabul" })}
                className="btn-brand rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Kabul
              </button>
              <button
                onClick={() => rpc("satranc_beraberlik", { gid: oyun.id, eylem: "reddet" })}
                className="rounded-xl bg-card2 px-4 py-2 text-sm"
              >
                Reddet
              </button>
            </div>
          )}
          {teklifBende && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">Beraberlik teklifin gönderildi.</span>
              <button
                onClick={() => rpc("satranc_beraberlik", { gid: oyun.id, eylem: "reddet" })}
                className="rounded-xl bg-card2 px-4 py-2"
              >
                Geri çek
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {!oyun.draw_offer_by && (
              <button
                onClick={() => rpc("satranc_beraberlik", { gid: oyun.id, eylem: "oner" })}
                disabled={isleniyor}
                className="rounded-xl bg-card2 px-4 py-2 text-sm hover:opacity-80"
              >
                🤝 Beraberlik öner
              </button>
            )}
            <button
              onClick={teslimOl}
              disabled={isleniyor}
              className="rounded-xl bg-card2 px-4 py-2 text-sm text-red-400 hover:opacity-80"
            >
              🏳️ Teslim ol
            </button>
          </div>
        </div>
      )}

      {oyun.status === "finished" && (
        <Link
          href="/oyunlar/satranc"
          className="btn-brand block rounded-2xl p-3 text-center font-semibold"
        >
          Yeni oyun için lobiye dön
        </Link>
      )}

      {hamleCiftleri.length > 0 && (
        <div className="rounded-2xl border border-line bg-card p-3">
          <p className="mb-1 text-xs font-semibold text-muted">Hamleler</p>
          <p className="max-h-28 overflow-y-auto text-sm leading-relaxed">
            {hamleCiftleri.join("   ")}
          </p>
        </div>
      )}
    </main>
  );
}