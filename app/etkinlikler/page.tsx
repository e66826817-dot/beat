"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { hataCevir } from "../../components/PostCard";

type Etkinlik = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  location: string | null;
  kind: string;
  starts_at: string;
  ends_at: string | null;
  profiles: { username: string } | null;
  groups: { name: string; slug: string } | null;
  event_attendees: { user_id: string }[];
};

type Sekme = "guncel" | "gecmis" | "benim";

const TURLER = [
  { id: "konser", etiket: "Konser", ikon: "🎟️" },
  { id: "bulusma", etiket: "Hayran buluşması", ikon: "🤝" },
  { id: "yayin", etiket: "Canlı yayın", ikon: "📡" },
  { id: "diger", etiket: "Diğer", ikon: "✨" },
] as const;

const SURELER = [
  { dk: 30, etiket: "30 dakika" },
  { dk: 60, etiket: "1 saat" },
  { dk: 120, etiket: "2 saat" },
  { dk: 180, etiket: "3 saat" },
  { dk: 360, etiket: "6 saat" },
  { dk: 720, etiket: "12 saat" },
  { dk: 1440, etiket: "1 gün" },
  { dk: 4320, etiket: "3 gün" },
  { dk: 10080, etiket: "7 gün" },
];

function sureMetni(dk: number) {
  if (dk < 1) return "1 dk";
  const gun = Math.floor(dk / 1440);
  const sa = Math.floor((dk % 1440) / 60);
  const d = Math.round(dk % 60);
  const parcalar: string[] = [];
  if (gun) parcalar.push(`${gun} gün`);
  if (sa) parcalar.push(`${sa} sa`);
  if (d && !gun) parcalar.push(`${d} dk`);
  return parcalar.join(" ") || "1 dk";
}

function zamanlar(e: Etkinlik, simdi: number) {
  const bas = new Date(e.starts_at).getTime();
  const bit = e.ends_at ? new Date(e.ends_at).getTime() : bas + 3 * 3600000;
  const durum: "yaklasan" | "canli" | "bitti" =
    simdi < bas ? "yaklasan" : simdi < bit ? "canli" : "bitti";
  return { bas, bit, durum, sureDk: Math.round((bit - bas) / 60000) };
}

function baslamayaKalan(bas: number, simdi: number) {
  const dk = Math.ceil((bas - simdi) / 60000);
  if (dk < 60) return `${dk} dk sonra başlıyor`;
  const sa = Math.floor(dk / 60);
  if (sa < 24) return `${sa} saat sonra`;
  const gun = Math.floor(sa / 24);
  return gun === 1 ? "Yarın" : `${gun} gün sonra`;
}

export default function EtkinliklerSayfasi() {
  const supabase = createClient();
  const [etkinlikler, setEtkinlikler] = useState<Etkinlik[]>([]);
  const [gruplar, setGruplar] = useState<{ id: string; name: string }[]>([]);
  const [kullaniciId, setKullaniciId] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [sekme, setSekme] = useState<Sekme>("guncel");
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");
  const [basari, setBasari] = useState("");
  const [simdi, setSimdi] = useState(Date.now());

  const [formAcik, setFormAcik] = useState(false);
  const [baslik, setBaslik] = useState("");
  const [tur, setTur] = useState("konser");
  const [zaman, setZaman] = useState("");
  const [sure, setSure] = useState(120);
  const [yer, setYer] = useState("");
  const [grupId, setGrupId] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [olusturuluyor, setOlusturuluyor] = useState(false);

  async function getir() {
    const { data, error } = await supabase
      .from("events")
      .select(
        "id, creator_id, title, description, location, kind, starts_at, ends_at, profiles!events_creator_id_fkey(username), groups!events_group_id_fkey(name, slug), event_attendees(user_id)"
      )
      .order("starts_at", { ascending: true })
      .limit(200);
    if (error) setHata(error.message);
    else
      setEtkinlikler(
        ((data as unknown as Etkinlik[]) || []).map((e) => ({
          ...e,
          event_attendees: e.event_attendees ?? [],
        }))
      );
  }

  useEffect(() => {
    async function baslat() {
      const { data: k } = await supabase.auth.getUser();
      setKullaniciId(k.user?.id ?? null);
      if (k.user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", k.user.id)
          .single();
        setAdmin(p?.role === "admin");
      }
      const { data: g } = await supabase
        .from("groups")
        .select("id, name")
        .order("name");
      setGruplar(g || []);
      await getir();
      setYukleniyor(false);
    }
    baslat();
    const sayac = setInterval(() => setSimdi(Date.now()), 30000);
    return () => clearInterval(sayac);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function olustur(e: React.FormEvent) {
    e.preventDefault();
    if (!kullaniciId || olusturuluyor) return;
    setHata("");
    setBasari("");

    const baslangic = new Date(zaman);
    if (!zaman || isNaN(baslangic.getTime())) {
      setHata("Geçerli bir tarih ve saat seç.");
      return;
    }
    if (baslangic.getTime() < Date.now() - 5 * 60000) {
      setHata("Etkinlik başlangıcı geçmişte olamaz.");
      return;
    }

    setOlusturuluyor(true);
    const bitis = new Date(baslangic.getTime() + sure * 60000);
    const { error } = await supabase.from("events").insert({
      creator_id: kullaniciId,
      title: baslik.trim(),
      kind: tur,
      starts_at: baslangic.toISOString(),
      ends_at: bitis.toISOString(),
      location: yer.trim() || null,
      group_id: grupId || null,
      description: aciklama.trim() || null,
    });
    if (error) {
      setHata(
        error.message.includes("check constraint")
          ? "Başlık 3-80 karakter olmalı."
          : hataCevir(error.message)
      );
    } else {
      setBasari("Etkinlik oluşturuldu!");
      setBaslik("");
      setZaman("");
      setYer("");
      setGrupId("");
      setAciklama("");
      setFormAcik(false);
      setSekme("guncel");
      await getir();
    }
    setOlusturuluyor(false);
  }

  async function katilDegistir(e: Etkinlik) {
    if (!kullaniciId) {
      setHata("Katılmak için giriş yapmalısın.");
      return;
    }
    setHata("");
    const katiliyor = e.event_attendees.some((a) => a.user_id === kullaniciId);
    const { error } = katiliyor
      ? await supabase
          .from("event_attendees")
          .delete()
          .eq("event_id", e.id)
          .eq("user_id", kullaniciId)
      : await supabase
          .from("event_attendees")
          .insert({ event_id: e.id, user_id: kullaniciId });
    if (error) setHata(hataCevir(error.message));
    else await getir();
  }

  async function bitisiDegistir(e: Etkinlik, yeniBitis: number) {
    setHata("");
    const { error } = await supabase
      .from("events")
      .update({ ends_at: new Date(yeniBitis).toISOString() })
      .eq("id", e.id);
    if (error) setHata(hataCevir(error.message));
    else await getir();
  }

  async function sil(e: Etkinlik) {
    if (!window.confirm(`"${e.title}" etkinliği silinsin mi?`)) return;
    setHata("");
    const { data, error } = await supabase
      .from("events")
      .delete()
      .eq("id", e.id)
      .select("id");
    if (error || !data || data.length === 0) {
      setHata(hataCevir(error?.message ?? "Etkinlik silinemedi."));
      return;
    }
    await getir();
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 p-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-3xl border border-line bg-card"
          />
        ))}
      </main>
    );
  }

  const sirali = etkinlikler.map((e) => ({ e, z: zamanlar(e, simdi) }));
  let gosterilen: { e: Etkinlik; z: ReturnType<typeof zamanlar> }[];
  if (sekme === "gecmis") {
    gosterilen = sirali
      .filter((x) => x.z.durum === "bitti")
      .sort((a, b) => b.z.bit - a.z.bit);
  } else if (sekme === "benim") {
    gosterilen = sirali.filter(
      (x) =>
        x.e.creator_id === kullaniciId ||
        x.e.event_attendees.some((a) => a.user_id === kullaniciId)
    );
  } else {
    gosterilen = sirali
      .filter((x) => x.z.durum !== "bitti")
      .sort((a, b) => {
        if (a.z.durum !== b.z.durum) return a.z.durum === "canli" ? -1 : 1;
        return a.z.bas - b.z.bas;
      });
  }

  const alan =
    "w-full rounded-2xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand";

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold">📅 Etkinlikler</h2>
          <p className="text-sm text-muted">
            Konser, buluşma ve yayın planlarını süresiyle paylaş.
          </p>
        </div>
        {kullaniciId && (
          <button
            onClick={() => setFormAcik(!formAcik)}
            className="btn-brand shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            {formAcik ? "Vazgeç" : "+ Etkinlik"}
          </button>
        )}
      </div>

      {!kullaniciId && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-muted">
          Etkinlik oluşturmak ve katılmak için{" "}
          <Link href="/giris" className="text-brand hover:underline">
            giriş yap
          </Link>
          .
        </p>
      )}

      {formAcik && (
        <form
          onSubmit={olustur}
          className="space-y-3 rounded-3xl border border-line bg-card p-4"
        >
          <input
            value={baslik}
            onChange={(e) => setBaslik(e.target.value)}
            placeholder="Etkinlik adı"
            maxLength={80}
            required
            className={alan}
          />
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {TURLER.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTur(t.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  tur === t.id ? "btn-brand" : "bg-card2 text-muted hover:text-ink"
                }`}
              >
                {t.ikon} {t.etiket}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs text-muted">Başlangıç</p>
              <input
                type="datetime-local"
                value={zaman}
                onChange={(e) => setZaman(e.target.value)}
                required
                className={alan}
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted">Süre</p>
              <select
                value={sure}
                onChange={(e) => setSure(Number(e.target.value))}
                className={alan}
              >
                {SURELER.map((s) => (
                  <option key={s.dk} value={s.dk}>
                    {s.etiket}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <input
            value={yer}
            onChange={(e) => setYer(e.target.value)}
            placeholder="Yer (örn: Zorlu PSM, İstanbul ya da online)"
            maxLength={100}
            className={alan}
          />
          <select
            value={grupId}
            onChange={(e) => setGrupId(e.target.value)}
            className={alan}
          >
            <option value="">🎤 İlgili grup (isteğe bağlı)</option>
            {gruplar.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <textarea
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            placeholder="Açıklama (isteğe bağlı)"
            maxLength={500}
            rows={3}
            className={`${alan} resize-none`}
          />
          <p className="text-xs text-muted">Günde en fazla 3 etkinlik oluşturabilirsin.</p>
          <button
            type="submit"
            disabled={olusturuluyor || baslik.trim().length < 3}
            className="btn-brand w-full rounded-xl p-3 font-semibold"
          >
            {olusturuluyor ? "Oluşturuluyor..." : "Etkinliği oluştur"}
          </button>
        </form>
      )}

      {hata && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}
      {basari && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-green-500">
          {basari}
        </p>
      )}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {(
          [
            ["guncel", "Canlı ve yaklaşan"],
            ["gecmis", "Geçmiş"],
            ...(kullaniciId ? [["benim", "Benim etkinliklerim"]] : []),
          ] as [Sekme, string][]
        ).map(([anahtar, etiket]) => (
          <button
            key={anahtar}
            onClick={() => setSekme(anahtar)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              sekme === anahtar ? "btn-brand" : "bg-card2 text-muted hover:text-ink"
            }`}
          >
            {etiket}
          </button>
        ))}
      </div>

      {gosterilen.length === 0 && !hata && (
        <div className="rounded-3xl border border-dashed border-line py-12 text-center text-muted">
          <p className="text-4xl">📅</p>
          <p className="mt-2 px-4">
            {sekme === "guncel"
              ? "Canlı ya da yaklaşan etkinlik yok. İlk etkinliği sen oluştur!"
              : sekme === "gecmis"
              ? "Geçmiş etkinlik yok."
              : "Henüz bir etkinliğe katılmadın ve etkinlik oluşturmadın."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {gosterilen.map(({ e, z }) => {
          const katiliyor = e.event_attendees.some(
            (a) => a.user_id === kullaniciId
          );
          const tip = TURLER.find((t) => t.id === e.kind);
          const yonetebilir = admin || e.creator_id === kullaniciId;
          const baslangic = new Date(z.bas);
          const canli = z.durum === "canli";
          const bitti = z.durum === "bitti";
          return (
            <section
              key={e.id}
              className={`space-y-3 rounded-3xl border bg-card p-4 shadow-sm ${
                canli ? "border-brand" : "border-line"
              } ${bitti ? "opacity-70" : ""}`}
            >
              <div className="flex gap-3">
                <div className="btn-brand flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl leading-tight">
                  <span className="text-2xl font-extrabold">
                    {baslangic.getDate()}
                  </span>
                  <span className="text-[11px] uppercase">
                    {baslangic.toLocaleDateString("tr-TR", { month: "short" })}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs font-semibold ${
                      canli ? "text-red-400" : "text-brand"
                    }`}
                  >
                    {canli
                      ? `🔴 Şimdi canlı · ${sureMetni(
                          Math.ceil((z.bit - simdi) / 60000)
                        )} kaldı`
                      : bitti
                      ? "Bitti"
                      : `${tip?.ikon} ${tip?.etiket} · ${baslamayaKalan(z.bas, simdi)}`}
                  </p>
                  <h3 className="text-lg font-bold leading-tight">{e.title}</h3>
                  <p className="text-sm text-muted">
                    🕒{" "}
                    {baslangic.toLocaleString("tr-TR", {
                      weekday: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" · "}⏱ {sureMetni(z.sureDk)}
                  </p>
                  <p className="text-xs text-muted">
                    Bitiş:{" "}
                    {new Date(z.bit).toLocaleString("tr-TR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {e.location && (
                    <p className="text-sm text-muted">📍 {e.location}</p>
                  )}
                </div>
              </div>

              {e.description && (
                <p className="whitespace-pre-wrap text-sm">{e.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                {tip && (
                  <span className="rounded-full bg-card2 px-3 py-1">
                    {tip.ikon} {tip.etiket}
                  </span>
                )}
                {e.groups && (
                  <Link
                    href={`/gruplar/${e.groups.slug}`}
                    className="rounded-full bg-card2 px-3 py-1 font-semibold text-brand"
                  >
                    🎤 {e.groups.name}
                  </Link>
                )}
                {e.profiles?.username && (
                  <Link
                    href={`/profil/${e.profiles.username}`}
                    className="hover:text-brand"
                  >
                    @{e.profiles.username} oluşturdu
                  </Link>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                <span className="text-sm text-muted">
                  👥 {e.event_attendees.length} katılımcı
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  {yonetebilir && !bitti && (
                    <button
                      onClick={() => bitisiDegistir(e, z.bit + 3600000)}
                      className="rounded-xl px-3 py-2 text-sm text-muted hover:bg-card2"
                    >
                      +1 sa
                    </button>
                  )}
                  {yonetebilir && canli && (
                    <button
                      onClick={() => bitisiDegistir(e, Date.now())}
                      className="rounded-xl px-3 py-2 text-sm text-muted hover:bg-card2"
                    >
                      Şimdi bitir
                    </button>
                  )}
                  {yonetebilir && (
                    <button
                      onClick={() => sil(e)}
                      className="rounded-xl px-3 py-2 text-sm text-red-400 hover:bg-card2"
                    >
                      Sil
                    </button>
                  )}
                  {!bitti && (
                    <button
                      onClick={() => katilDegistir(e)}
                      className={`rounded-xl px-5 py-2 text-sm font-semibold ${
                        katiliyor
                          ? "bg-card2 text-muted hover:text-ink"
                          : "btn-brand"
                      }`}
                    >
                      {katiliyor ? "✓ Katılıyorsun" : "Katılıyorum"}
                    </button>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}