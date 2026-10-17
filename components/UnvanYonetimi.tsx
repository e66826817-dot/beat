"use client";

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase";
import { hataCevir } from "./PostCard";

type Unvan = { id: string; name: string; is_private: boolean };
type Izinli = { user_id: string; profiles: { username: string } | null };

export default function UnvanYonetimi({
  profilId,
  olusturabilir,
  ipucu,
  onDegisti,
}: {
  profilId: string;
  olusturabilir: boolean;
  ipucu: string;
  onDegisti: () => void | Promise<void>;
}) {
  const supabase = createClient();
  const [unvanlar, setUnvanlar] = useState<Unvan[]>([]);
  const [yeni, setYeni] = useState("");
  const [ozel, setOzel] = useState(false);
  const [acikId, setAcikId] = useState<string | null>(null);
  const [izinliler, setIzinliler] = useState<Izinli[]>([]);
  const [kisi, setKisi] = useState("");
  const [hata, setHata] = useState("");
  const [basari, setBasari] = useState("");

  async function getir() {
    const { data } = await supabase
      .from("titles")
      .select("id, name, is_private")
      .eq("creator_id", profilId)
      .order("created_at");
    setUnvanlar(data || []);
  }

  async function izinleriGetir(tid: string) {
    const { data } = await supabase
      .from("title_allowed")
      .select("user_id, profiles!title_allowed_user_id_fkey(username)")
      .eq("title_id", tid)
      .order("created_at");
    setIzinliler((data as unknown as Izinli[]) || []);
  }

  useEffect(() => {
    getir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profilId]);

  async function olustur(e: React.FormEvent) {
    e.preventDefault();
    const ad = yeni.trim();
    if (ad.length < 2 || ad.length > 20) {
      setHata("Ünvan 2 ile 20 karakter arasında olmalı.");
      return;
    }
    setHata("");
    setBasari("");
    const { error } = await supabase
      .from("titles")
      .insert({ name: ad, creator_id: profilId, is_private: ozel });
    if (error) {
      setHata(
        error.code === "23505"
          ? "Bu isimde bir ünvan zaten var."
          : error.message.includes("row-level security")
          ? "Ünvan oluşturamadın: yetkin yok ya da en fazla 3 ünvanın olabilir."
          : hataCevir(error.message)
      );
      return;
    }
    setYeni("");
    setOzel(false);
    setBasari(
      ozel
        ? `"${ad}" özel ünvanı oluşturuldu. Kişileri aşağıdan ekle.`
        : `"${ad}" ünvanı oluşturuldu.`
    );
    await getir();
    await onDegisti();
  }

  async function sil(u: Unvan) {
    if (!window.confirm(`"${u.name}" silinsin mi? Takan herkesten kalkar.`)) return;
    setHata("");
    const { data, error } = await supabase
      .from("titles")
      .delete()
      .eq("id", u.id)
      .select("id");
    if (error || !data || data.length === 0) {
      setHata(hataCevir(error?.message ?? "Ünvan silinemedi."));
      return;
    }
    if (acikId === u.id) setAcikId(null);
    await getir();
    await onDegisti();
  }

  async function yonet(u: Unvan) {
    if (acikId === u.id) {
      setAcikId(null);
      return;
    }
    setAcikId(u.id);
    setKisi("");
    await izinleriGetir(u.id);
  }

  async function kisiEkle(e: React.FormEvent, tid: string) {
    e.preventDefault();
    const ad = kisi.trim().replace(/^@/, "").toLowerCase();
    if (!ad) return;
    setHata("");
    const { data: p } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", ad)
      .maybeSingle();
    if (!p) {
      setHata(`@${ad} adında kullanıcı bulunamadı.`);
      return;
    }
    if (p.id === profilId) {
      setHata("Kendini eklemene gerek yok, ünvan zaten senin.");
      return;
    }
    const { error } = await supabase
      .from("title_allowed")
      .insert({ title_id: tid, user_id: p.id });
    if (error) {
      setHata(
        error.code === "23505"
          ? "Bu kişi zaten ekli."
          : hataCevir(error.message)
      );
      return;
    }
    setKisi("");
    await izinleriGetir(tid);
  }

  async function kisiCikar(tid: string, uid: string) {
    setHata("");
    const { error } = await supabase
      .from("title_allowed")
      .delete()
      .eq("title_id", tid)
      .eq("user_id", uid);
    if (error) setHata(hataCevir(error.message));
    else await izinleriGetir(tid);
  }

  const alan =
    "rounded-xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand";

  return (
    <section className="space-y-3 rounded-2xl border border-line bg-card p-4">
      <h3 className="font-bold">Kendi ünvanını oluştur</h3>
      {!olusturabilir ? (
        <p className="text-sm text-muted">{ipucu}</p>
      ) : (
        <>
          <p className="text-sm text-muted">
            En fazla 3 ünvan oluşturabilirsin ({unvanlar.length}/3). Herkese
            açık ünvanı herkes takabilir. <b>Özel</b> ünvanı yalnızca senin
            eklediğin kişiler takabilir. Takan herkes için sana bildirim gelir.
          </p>

          {unvanlar.length < 3 && (
            <form onSubmit={olustur} className="space-y-2">
              <div className="flex gap-2">
                <input
                  value={yeni}
                  onChange={(e) => setYeni(e.target.value)}
                  placeholder="Örn: Konser Kurdu"
                  maxLength={20}
                  className={`${alan} min-w-0 flex-1`}
                />
                <button
                  type="submit"
                  disabled={yeni.trim().length < 2}
                  className="btn-brand rounded-xl px-5 py-2 text-sm font-semibold"
                >
                  Oluştur
                </button>
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-card2 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={ozel}
                  onChange={(e) => setOzel(e.target.checked)}
                  className="h-5 w-5"
                />
                <span>
                  🔒 <b>Özel ünvan</b>
                  <span className="block text-xs text-muted">
                    Sadece seçtiğin kişiler takabilir.
                  </span>
                </span>
              </label>
            </form>
          )}

          {hata && <p className="text-sm text-yellow-500">{hata}</p>}
          {basari && <p className="text-sm text-green-500">{basari}</p>}

          <div className="space-y-2">
            {unvanlar.map((u) => (
              <div key={u.id} className="rounded-xl bg-card2 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-semibold">
                    {u.is_private ? "🔒" : "✦"} {u.name}
                  </span>
                  <span className="flex shrink-0 gap-3">
                    {u.is_private && (
                      <button
                        onClick={() => yonet(u)}
                        className="text-brand hover:underline"
                      >
                        {acikId === u.id ? "Kapat" : "Kişiler"}
                      </button>
                    )}
                    <button
                      onClick={() => sil(u)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Sil
                    </button>
                  </span>
                </div>

                {acikId === u.id && (
                  <div className="mt-3 space-y-2 border-t border-line pt-3">
                    <form
                      onSubmit={(e) => kisiEkle(e, u.id)}
                      className="flex gap-2"
                    >
                      <input
                        value={kisi}
                        onChange={(e) => setKisi(e.target.value)}
                        placeholder="Kullanıcı adı (örn: beatfan)"
                        className={`${alan} min-w-0 flex-1 bg-card`}
                      />
                      <button
                        type="submit"
                        disabled={!kisi.trim()}
                        className="btn-brand rounded-xl px-4 py-2 text-sm font-semibold"
                      >
                        Ekle
                      </button>
                    </form>
                    {izinliler.length === 0 && (
                      <p className="text-xs text-muted">
                        Henüz kimse eklenmedi. Sen takabilirsin.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {izinliler.map((i) => (
                        <span
                          key={i.user_id}
                          className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs"
                        >
                          @{i.profiles?.username ?? "?"}
                          <button
                            onClick={() => kisiCikar(u.id, i.user_id)}
                            className="text-red-400"
                            aria-label="Çıkar"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}