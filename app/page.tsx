"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase";
import NotlarSeridi from "../components/NotlarSeridi";
import DunUnArtisti from "../components/DununArtisti";
import IlkAdimlar from "../components/IlkAdimlar";
import GunlukKanca from "../components/GunlukKanca";
import AnasayfaAnket from "../components/AnasayfaAnket";
import TakipOnerileri from "../components/TakipOnerileri";
import PostCard, {
  Avatar,
  Gonderi,
  GONDERI_SORGUSU,
  KATEGORILER,
  MAKS_FOTO,
  fotolariYukle,
  gonderiDuzenle,
  hataCevir,
} from "../components/PostCard";

type Sekme = "herkes" | "populer" | "takip" | "kaydedilen";

type GrupSecenek = { id: string; name: string };

type GununSorusu = { id: string; question: string; cevapSayisi: number };

type TrendEtiket = { etiket: string; sayi: number };

type EtkinlikOzet = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  event_attendees: { user_id: string }[];
};

type DogumGunu = {
  id: string;
  ad: string;
  grupAdi: string;
  grupSlug: string;
  kalanGun: number;
  tarih: Date;
};

type UyeSatiri = {
  id: string;
  name: string;
  stage_name: string | null;
  birthday: string | null;
  groups: { name: string; slug: string } | null;
};

function dogumGunleriHesapla(uyeler: UyeSatiri[]): DogumGunu[] {
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const sonuc: DogumGunu[] = [];

  for (const u of uyeler) {
    if (!u.birthday || !u.groups) continue;
    const [, ay, gun] = u.birthday.split("-").map(Number);
    if (!ay || !gun) continue;

    let sonraki = new Date(bugun.getFullYear(), ay - 1, gun);
    if (sonraki < bugun) {
      sonraki = new Date(bugun.getFullYear() + 1, ay - 1, gun);
    }
    const kalanGun = Math.round(
      (sonraki.getTime() - bugun.getTime()) / 86400000
    );
    if (kalanGun <= 30) {
      sonuc.push({
        id: u.id,
        ad: u.stage_name || u.name,
        grupAdi: u.groups.name,
        grupSlug: u.groups.slug,
        kalanGun,
        tarih: sonraki,
      });
    }
  }
  return sonuc.sort((a, b) => a.kalanGun - b.kalanGun);
}

// Gönderi metinlerinden en çok geçen etiketleri hesaplar
function trendHesapla(metinler: (string | null)[]): TrendEtiket[] {
  const sayac = new Map<string, number>();
  for (const m of metinler) {
    if (!m) continue;
    const bulunan = new Set(
      (m.match(/#[\p{L}\p{N}_]+/gu) || []).map((t) =>
        t.slice(1).toLowerCase()
      )
    );
    bulunan.forEach((t) => sayac.set(t, (sayac.get(t) ?? 0) + 1));
  }
  return Array.from(sayac.entries())
    .map(([etiket, sayi]) => ({ etiket, sayi }))
    .sort((a, b) => b.sayi - a.sayi || a.etiket.localeCompare(b.etiket))
    .slice(0, 8);
}

export default function AnaSayfa() {
  const supabase = createClient();

  const [kullaniciId, setKullaniciId] = useState<string | null>(null);
  const [kullaniciAdi, setKullaniciAdi] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [metin, setMetin] = useState("");
  const [gonderiler, setGonderiler] = useState<Gonderi[]>([]);
  const [sabitler, setSabitler] = useState<Gonderi[]>([]);
  const [hata, setHata] = useState("");
  const [dosyalar, setDosyalar] = useState<File[]>([]);
  const [sekme, setSekme] = useState<Sekme>("herkes");
  const [filtreKategori, setFiltreKategori] = useState("hepsi");
  const [yeniKategori, setYeniKategori] = useState("genel");
  const [takipGruplar, setTakipGruplar] = useState<string[]>([]);
  const [takipKullanicilar, setTakipKullanicilar] = useState<string[]>([]);
  const [gruplar, setGruplar] = useState<GrupSecenek[]>([]);
  const [secilenGrup, setSecilenGrup] = useState("");
  const [dogumGunleri, setDogumGunleri] = useState<DogumGunu[]>([]);
  const [gununSorusu, setGununSorusu] = useState<GununSorusu | null>(null);
  const [trendler, setTrendler] = useState<TrendEtiket[]>([]);
  const [etkinlikler, setEtkinlikler] = useState<EtkinlikOzet[]>([]);
  const [paylasiliyor, setPaylasiliyor] = useState(false);

  async function gonderileriGetir() {
    const [ana, sabit] = await Promise.all([
      supabase
        .from("posts")
        .select(GONDERI_SORGUSU)
        .is("question_id", null)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("posts")
        .select(GONDERI_SORGUSU)
        .is("question_id", null)
        .not("pinned_at", "is", null)
        .order("pinned_at", { ascending: false })
        .limit(3),
    ]);

    if (ana.error) {
      setHata(ana.error.message);
      setGonderiler([]);
    } else {
      setGonderiler(
        ((ana.data as unknown as Gonderi[]) || []).map(gonderiDuzenle)
      );
    }
    setSabitler(
      ((sabit.data as unknown as Gonderi[]) || []).map(gonderiDuzenle)
    );
  }

  async function trendleriGetir() {
    const yediGunOnce = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await supabase
      .from("posts")
      .select("content")
      .gte("created_at", yediGunOnce)
      .like("content", "%#%")
      .limit(500);
    setTrendler(trendHesapla((data || []).map((x) => x.content)));
  }

  useEffect(() => {
    async function baslat() {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setKullaniciId(data.user.id);
        const { data: profil } = await supabase
          .from("profiles")
          .select("username, avatar_url, role")
          .eq("id", data.user.id)
          .single();
        if (profil) {
          setKullaniciAdi(profil.username);
          setAvatarUrl(profil.avatar_url);
          setAdmin(profil.role === "admin");
        }

        const { data: takipler } = await supabase
          .from("group_follows")
          .select("group_id")
          .eq("user_id", data.user.id);
        setTakipGruplar((takipler || []).map((t) => t.group_id));

        const { data: kisiTakipleri } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", data.user.id);
        setTakipKullanicilar((kisiTakipleri || []).map((t) => t.following_id));
      }

      const { data: grupVeri } = await supabase
        .from("groups")
        .select("id, name")
        .order("name");
      setGruplar(grupVeri || []);

      const { data: uyeVeri } = await supabase
        .from("group_members")
        .select(
          "id, name, stage_name, birthday, groups!group_members_group_id_fkey(name, slug)"
        )
        .not("birthday", "is", null);
      setDogumGunleri(
        dogumGunleriHesapla((uyeVeri as unknown as UyeSatiri[]) || [])
      );

            const { data: ev } = await supabase
        .from("events")
        .select(
          "id, title, starts_at, ends_at, location, event_attendees(user_id)"
        )
        .gte("ends_at", new Date().toISOString())
        .order("starts_at")
        .limit(3);
      setEtkinlikler((ev as unknown as EtkinlikOzet[]) || []);

      const { data: soru } = await supabase
        .from("daily_questions")
        .select("id, question")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (soru) {
        const { count } = await supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("question_id", soru.id);
        setGununSorusu({
          id: soru.id,
          question: soru.question,
          cevapSayisi: count ?? 0,
        });
      }

      await trendleriGetir();
      await gonderileriGetir();
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dosyaSec(liste: FileList | null) {
    if (!liste) return;
    const birlesik = [...dosyalar, ...Array.from(liste)];
    if (birlesik.length > MAKS_FOTO) {
      setHata(`En fazla ${MAKS_FOTO} fotoğraf ekleyebilirsin.`);
    } else {
      setHata("");
    }
    setDosyalar(birlesik.slice(0, MAKS_FOTO));
  }

  async function paylas(e: React.FormEvent) {
    e.preventDefault();
    if ((!metin.trim() && dosyalar.length === 0) || !kullaniciId || paylasiliyor)
      return;
    setHata("");
    setPaylasiliyor(true);

    const yukleme = await fotolariYukle(supabase, kullaniciId, dosyalar);
    if (yukleme.hata) {
      setHata(yukleme.hata);
      setPaylasiliyor(false);
      return;
    }

    const { error } = await supabase.from("posts").insert({
      user_id: kullaniciId,
      group_id: secilenGrup || null,
      category: yeniKategori,
      content: metin.trim() || null,
      image_urls: yukleme.urls,
    });

    if (error) {
      setHata(hataCevir(error.message));
    } else {
      setMetin("");
      setDosyalar([]);
      setYeniKategori("genel");
      await gonderileriGetir();
      await trendleriGetir();
    }
    setPaylasiliyor(false);
  }

  let gosterilen: Gonderi[];
  if (sekme === "takip") {
    gosterilen = gonderiler.filter(
      (g) =>
        (g.group_id && takipGruplar.includes(g.group_id)) ||
        takipKullanicilar.includes(g.user_id)
    );
  } else if (sekme === "kaydedilen") {
    gosterilen = gonderiler.filter((g) => g.bookmarks.length > 0);
  } else if (sekme === "populer") {
    const yediGunOnce = Date.now() - 7 * 86400000;
    gosterilen = gonderiler
      .filter(
        (g) =>
          new Date(g.created_at).getTime() >= yediGunOnce && g.likes.length > 0
      )
      .sort(
        (a, b) =>
          b.likes.length - a.likes.length ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  } else {
    // Sabitlenenler en üstte, sonra kronolojik akış
    gosterilen = [...sabitler, ...gonderiler.filter((g) => !g.pinned_at)];
  }
  if (filtreKategori !== "hepsi") {
    gosterilen = gosterilen.filter((g) => g.category === filtreKategori);
  }
  gosterilen = gosterilen.slice(0, 50);

  const sekmeler: [Sekme, string][] = [
    ["herkes", "Herkes"],
    ["populer", "🔥 Popüler"],
  ];
  if (kullaniciId) {
    sekmeler.push(["takip", "Takip ettiklerim"], ["kaydedilen", "🔖 Kaydedilenler"]);
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-3xl border border-line bg-card"
          />
        ))}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      {!kullaniciId && (
        <section className="btn-brand rounded-3xl p-6 text-center">
          <h2 className="text-2xl font-extrabold">Beat&apos;e hoş geldin</h2>
          <p className="mt-1 text-sm opacity-90">
            Yeni nesil boyband ve girlband&apos;lerin hayran buluşma noktası.
          </p>
          <Link
            href="/giris"
            className="mt-4 inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black"
          >
            Giriş yap / Kayıt ol
          </Link>
        </section>
      )}

                  <Link
        href="/oyunlar/okey"
        className="sezon-kart btn-brand rounded-3xl p-4 text-center transition hover:-translate-y-0.5"
      >
        <p className="text-lg font-extrabold">🎃 Cadılar Bayramı özel</p>
        <p className="text-sm opacity-90">
          Okey masası kuruldu, 3 arkadaşını topla! 🦇
        </p>
      </Link>
            
                 <IlkAdimlar kullaniciId={kullaniciId} kullaniciAdi={kullaniciAdi} />
<NotlarSeridi kullaniciId={kullaniciId} />
      <AnasayfaAnket kullaniciId={kullaniciId} />
      <TakipOnerileri kullaniciId={kullaniciId} />
<GunlukKanca kullaniciId={kullaniciId} />
<DunUnArtisti />
      {gununSorusu && (
        <Link
          href="/soru"
          className="btn-brand block rounded-3xl p-5 transition hover:-translate-y-0.5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-90">
            💭 Günün sorusu
          </p>
          <p className="mt-1 text-xl font-extrabold">{gununSorusu.question}</p>
          <p className="mt-2 text-sm opacity-90">
            {gununSorusu.cevapSayisi > 0
              ? `${gununSorusu.cevapSayisi} cevap · sen de cevapla →`
              : "İlk cevabı sen yaz →"}
          </p>
        </Link>
      )}

      {etkinlikler.length > 0 && (
        <section className="space-y-2 rounded-3xl border border-line bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">📅 Yaklaşan etkinlikler</h3>
            <Link
              href="/etkinlikler"
              className="text-sm font-semibold text-brand hover:underline"
            >
              Tümü →
            </Link>
          </div>
          <div className="space-y-2">
            {etkinlikler.map((e) => (
              <Link
                key={e.id}
                href="/etkinlikler"
                className="flex items-center gap-3 rounded-2xl bg-card2 p-3 transition hover:-translate-y-0.5"
              >
                <div className="btn-brand flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl leading-tight">
                  <span className="text-base font-extrabold">
                    {new Date(e.starts_at).getDate()}
                  </span>
                  <span className="text-[10px] uppercase">
                    {new Date(e.starts_at).toLocaleDateString("tr-TR", {
                      month: "short",
                    })}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{e.title}</p>
                  <p className="truncate text-xs text-muted">
                    {e.location ? `${e.location} · ` : ""}
                    {e.event_attendees.length} katılımcı
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {trendler.length > 0 && (
        <section className="space-y-2 rounded-3xl border border-line bg-card p-4">
          <h3 className="font-bold">🔥 Gündemde</h3>
          <p className="text-xs text-muted">Son 7 günün en çok kullanılan etiketleri</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {trendler.map((t, i) => (
              <Link
                key={t.etiket}
                href={`/etiket/${encodeURIComponent(t.etiket)}`}
                className="rounded-full bg-card2 px-3 py-1.5 text-sm transition hover:-translate-y-0.5 hover:ring-2 hover:ring-brand"
              >
                <span className="mr-1 text-xs text-muted">{i + 1}</span>
                <span className="font-semibold text-brand">#{t.etiket}</span>
                <span className="ml-1.5 text-xs text-muted">{t.sayi}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {dogumGunleri.length > 0 && (
        <section className="space-y-2 rounded-3xl border border-line bg-card p-4">
          <h3 className="font-bold">🎂 Yaklaşan doğum günleri</h3>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {dogumGunleri.map((d) => (
              <Link
                key={d.id}
                href={`/gruplar/${d.grupSlug}`}
                className={`min-w-36 shrink-0 rounded-2xl p-3 transition hover:-translate-y-0.5 ${
                  d.kalanGun === 0 ? "btn-brand" : "bg-card2"
                }`}
              >
                <p className="font-semibold leading-tight">{d.ad}</p>
                <p
                  className={`text-xs ${
                    d.kalanGun === 0 ? "opacity-90" : "text-muted"
                  }`}
                >
                  {d.grupAdi}
                </p>
                <p
                  className={`mt-1 text-xs font-semibold ${
                    d.kalanGun === 0 ? "" : "text-brand"
                  }`}
                >
                  {d.kalanGun === 0
                    ? "🎉 Bugün!"
                    : d.kalanGun === 1
                    ? "Yarın"
                    : `${d.kalanGun} gün sonra`}
                </p>
                <p
                  className={`text-xs ${
                    d.kalanGun === 0 ? "opacity-90" : "text-muted"
                  }`}
                >
                  {d.tarih.toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {kullaniciId && (
        <form
          onSubmit={paylas}
          className="space-y-3 rounded-3xl border border-line bg-card p-4"
        >
          <div className="flex gap-3">
            <Avatar url={avatarUrl} ad={kullaniciAdi || "?"} />
            <textarea
              value={metin}
              onChange={(e) => setMetin(e.target.value)}
              placeholder="Ne düşünüyorsun? #etiket ve @kullanici kullanabilirsin"
              maxLength={500}
              rows={3}
              className="min-w-0 flex-1 resize-none rounded-2xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand"
            />
          </div>

          {dosyalar.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {dosyalar.map((d, i) => (
                <div key={`${d.name}-${i}`} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(d)}
                    alt={d.name}
                    className="h-20 w-20 rounded-xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDosyalar(dosyalar.filter((_, k) => k !== i))
                    }
                    className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/80 text-xs text-white"
                    aria-label="Kaldır"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {KATEGORILER.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setYeniKategori(k.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  yeniKategori === k.id
                    ? "btn-brand"
                    : "bg-card2 text-muted hover:text-ink"
                }`}
              >
                {k.ikon} {k.etiket}
              </button>
            ))}
          </div>

          <select
            value={secilenGrup}
            onChange={(e) => setSecilenGrup(e.target.value)}
            className="w-full rounded-2xl bg-card2 p-3 text-sm text-ink outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="">🎤 Hangi grup hakkında? (isteğe bağlı)</option>
            {gruplar.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="cursor-pointer rounded-xl bg-card2 px-3 py-2.5 text-sm text-muted hover:text-ink">
              📷{" "}
              {dosyalar.length > 0
                ? `${dosyalar.length}/${MAKS_FOTO} fotoğraf`
                : `Fotoğraf (en fazla ${MAKS_FOTO})`}
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={dosyalar.length >= MAKS_FOTO}
                onChange={(e) => {
                  dosyaSec(e.target.files);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">{metin.length}/500</span>
              <button
                type="submit"
                disabled={
                  (!metin.trim() && dosyalar.length === 0) || paylasiliyor
                }
                className="btn-brand rounded-xl px-6 py-2.5 text-sm font-semibold"
              >
                {paylasiliyor ? "Paylaşılıyor..." : "Paylaş"}
              </button>
            </div>
          </div>
        </form>
      )}

      {hata && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {sekmeler.map(([anahtar, etiket]) => (
          <button
            key={anahtar}
            onClick={() => setSekme(anahtar)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              sekme === anahtar
                ? "btn-brand"
                : "bg-card2 text-muted hover:text-ink"
            }`}
          >
            {etiket}
          </button>
        ))}
      </div>

      <div className="-mx-4 -mt-1 flex gap-2 overflow-x-auto px-4 pb-1">
        {[{ id: "hepsi", etiket: "Tümü", ikon: "✨" }, ...KATEGORILER].map(
          (k) => (
            <button
              key={k.id}
              onClick={() => setFiltreKategori(k.id)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                filtreKategori === k.id
                  ? "border-brand text-brand"
                  : "border-line text-muted hover:text-ink"
              }`}
            >
              {k.ikon} {k.etiket}
            </button>
          )
        )}
      </div>

      <div className="space-y-3">
        {gosterilen.length === 0 && (
          <div className="rounded-3xl border border-dashed border-line py-12 text-center text-muted">
            <p className="text-4xl">🎶</p>
            <p className="mt-2 px-4">
              {sekme === "takip"
                ? "Takip ettiğin grup ve kişilerden henüz gönderi yok. Gruplar sayfasından bir grubu ya da bir profili takip et!"
                : sekme === "kaydedilen"
                ? "Henüz kaydettiğin gönderi yok. Gönderilerdeki 🔖 simgesiyle kaydedebilirsin."
                : sekme === "populer"
                ? "Son 7 günde beğenilen gönderi yok. Beğenerek ilk popüler gönderiyi sen belirle!"
                : "Bu filtrede gönderi yok. İlk paylaşımı sen yap!"}
            </p>
          </div>
        )}

        {gosterilen.map((g) => (
          <PostCard
            key={g.id}
            gonderi={g}
            kullaniciId={kullaniciId}
            admin={admin}
            onYenile={gonderileriGetir}
          />
        ))}
      </div>
    </main>
  );
}