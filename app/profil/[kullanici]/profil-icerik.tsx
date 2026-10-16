"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import PostCard, {
  Avatar,
  Gonderi,
  GONDERI_SORGUSU,
  UnvanRozeti,
  engelOnbellekSifirla,
  gonderiDuzenle,
  hataCevir,
  safMi,
} from "../../../components/PostCard";
import SikayetFormu from "../../../components/SikayetFormu";
import { temaBul } from "../../../lib/kozmetik";

type Profil = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  created_at: string;
  member_no: number | null;
  restriction: string | null;
  restricted_until: string | null;
  profile_theme: string;
  equipped_frame: string | null;
  banner_url: string | null;
  title: { name: string } | null;
};

type Sekme = "gonderiler" | "paylasimlar" | "tepkiler";

export default function ProfilSayfasi() {
  const supabase = createClient();
  const params = useParams<{ kullanici: string }>();
  const kullaniciAdi = decodeURIComponent(params.kullanici);

  const [profil, setProfil] = useState<Profil | null>(null);
  const [benimId, setBenimId] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [tumGonderiler, setTumGonderiler] = useState<Gonderi[]>([]);
  const [begeniler, setBegeniler] = useState<Gonderi[]>([]);
  const [sekme, setSekme] = useState<Sekme>("gonderiler");
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");
  const [basari, setBasari] = useState("");
  const [raporAcik, setRaporAcik] = useState(false);
  const [engelli, setEngelli] = useState(false);
  const [sessiz, setSessiz] = useState(false);

  const [takipciSayisi, setTakipciSayisi] = useState(0);
  const [takipSayisi, setTakipSayisi] = useState(0);
  const [takipEdiyor, setTakipEdiyor] = useState(false);

  const [duzenle, setDuzenle] = useState(false);
  const [gorunenAd, setGorunenAd] = useState("");
  const [bio, setBio] = useState("");
  const [avatarDosya, setAvatarDosya] = useState<File | null>(null);

  async function gonderileriGetir(uid: string) {
    const { data, error } = await supabase
      .from("posts")
      .select(GONDERI_SORGUSU)
      .eq("user_id", uid)
      .order("profile_pinned_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) setHata(error.message);
    else
      setTumGonderiler(
        ((data as unknown as Gonderi[]) || []).map(gonderiDuzenle)
      );
  }

  async function begenileriGetir(uid: string) {
    const { data: l } = await supabase
      .from("likes")
      .select("post_id")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(50);
    const idler = (l || []).map((x) => x.post_id);
    if (idler.length === 0) {
      setBegeniler([]);
      return;
    }
    const { data, error } = await supabase
      .from("posts")
      .select(GONDERI_SORGUSU)
      .in("id", idler);
    if (error) {
      setHata(error.message);
      return;
    }
    const liste = ((data as unknown as Gonderi[]) || []).map(gonderiDuzenle);
    liste.sort((a, b) => idler.indexOf(a.id) - idler.indexOf(b.id));
    setBegeniler(liste);
  }

  async function takipBilgisiGetir(profilId: string, uid: string | null) {
    const { data: takipciler } = await supabase
      .from("user_follows")
      .select("follower_id")
      .eq("following_id", profilId);
    const liste = takipciler || [];
    setTakipciSayisi(liste.length);
    setTakipEdiyor(uid ? liste.some((t) => t.follower_id === uid) : false);

    const { count } = await supabase
      .from("user_follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", profilId);
    setTakipSayisi(count ?? 0);
  }

  useEffect(() => {
    async function baslat() {
      const { data: kullanici } = await supabase.auth.getUser();
      const uid = kullanici.user?.id ?? null;
      setBenimId(uid);

      if (uid) {
        const { data: ben } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .single();
        setAdmin(ben?.role === "admin");
      }

      const { data: p, error } = await supabase
        .from("profiles")
        .select(
          "id, username, display_name, avatar_url, bio, role, created_at, member_no, restriction, restricted_until, profile_theme, equipped_frame, banner_url, title:equipped_title_id(name)"
        )
        .eq("username", kullaniciAdi)
        .single();

      if (error || !p) {
        setHata("Kullanıcı bulunamadı.");
      } else {
        const profilVerisi = p as unknown as Profil;
        setProfil(profilVerisi);
        setGorunenAd(profilVerisi.display_name ?? "");
        setBio(profilVerisi.bio ?? "");

        if (uid && uid !== profilVerisi.id) {
          const { data: e } = await supabase
            .from("blocks")
            .select("blocked_id")
            .eq("blocker_id", uid)
            .eq("blocked_id", profilVerisi.id)
            .maybeSingle();
          setEngelli(!!e);

          const { data: m } = await supabase
            .from("mutes")
            .select("muted_id")
            .eq("muter_id", uid)
            .eq("muted_id", profilVerisi.id)
            .maybeSingle();
          setSessiz(!!m);
        }

        await gonderileriGetir(profilVerisi.id);
        await begenileriGetir(profilVerisi.id);
        await takipBilgisiGetir(profilVerisi.id, uid);
      }
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kullaniciAdi]);

  async function yenile() {
    if (!profil) return;
    await gonderileriGetir(profil.id);
    await begenileriGetir(profil.id);
  }

  async function takipDegistir() {
    if (!profil) return;
    if (!benimId) {
      setHata("Takip etmek için giriş yapmalısın.");
      return;
    }
    setHata("");
    const { error } = takipEdiyor
      ? await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", benimId)
          .eq("following_id", profil.id)
      : await supabase
          .from("user_follows")
          .insert({ follower_id: benimId, following_id: profil.id });
    if (error) setHata(hataCevir(error.message));
    else await takipBilgisiGetir(profil.id, benimId);
  }

  async function sessizDegistir() {
    if (!profil || !benimId) return;
    setHata("");
    setBasari("");
    const { error } = sessiz
      ? await supabase
          .from("mutes")
          .delete()
          .eq("muter_id", benimId)
          .eq("muted_id", profil.id)
      : await supabase
          .from("mutes")
          .insert({ muter_id: benimId, muted_id: profil.id });
    if (error) {
      setHata(hataCevir(error.message));
      return;
    }
    setSessiz(!sessiz);
    setBasari(sessiz ? "Sessize alma kaldırıldı." : "Kullanıcı sessize alındı.");
    engelOnbellekSifirla();
  }

  async function engelDegistir() {
    if (!profil || !benimId) return;
    setHata("");
    setBasari("");

    if (engelli) {
      const { error } = await supabase
        .from("blocks")
        .delete()
        .eq("blocker_id", benimId)
        .eq("blocked_id", profil.id);
      if (error) {
        setHata(error.message);
        return;
      }
      setEngelli(false);
      setBasari("Engel kaldırıldı.");
    } else {
      if (
        !window.confirm(
          `@${profil.username} engellensin mi? Gönderileri ve yorumları senden gizlenir, takip ediyorsan takip kaldırılır.`
        )
      )
        return;
      const { error } = await supabase
        .from("blocks")
        .insert({ blocker_id: benimId, blocked_id: profil.id });
      if (error) {
        setHata(error.message);
        return;
      }
      await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", benimId)
        .eq("following_id", profil.id);
      setEngelli(true);
      setBasari("Kullanıcı engellendi.");
      await takipBilgisiGetir(profil.id, benimId);
    }
    engelOnbellekSifirla();
  }

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    if (!profil || benimId !== profil.id) return;
    setHata("");
    setBasari("");

    let avatarUrl = profil.avatar_url;

    if (avatarDosya) {
      if (avatarDosya.size > 2 * 1024 * 1024) {
        setHata("Profil fotoğrafı en fazla 2 MB olabilir.");
        return;
      }
      const uzanti = avatarDosya.name.split(".").pop()?.toLowerCase() || "jpg";
      const yol = `${profil.id}/avatar-${Date.now()}.${uzanti}`;
      const { error: yuklemeHatasi } = await supabase.storage
        .from("avatars")
        .upload(yol, avatarDosya);
      if (yuklemeHatasi) {
        setHata(yuklemeHatasi.message);
        return;
      }
      avatarUrl = supabase.storage.from("avatars").getPublicUrl(yol).data
        .publicUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: gorunenAd.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
      })
      .eq("id", profil.id);

    if (error) {
      setHata(error.message);
    } else {
      setProfil({
        ...profil,
        display_name: gorunenAd.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
      });
      setAvatarDosya(null);
      setDuzenle(false);
      setBasari("Profil güncellendi.");
    }
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 p-4">
        <div className="h-44 animate-pulse rounded-3xl border border-line bg-card" />
        <div className="h-24 animate-pulse rounded-3xl border border-line bg-card" />
      </main>
    );
  }

  const benimProfilim = profil && benimId === profil.id;
  const tema = temaBul(profil?.profile_theme);
  const alan =
    "w-full rounded-2xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand";

  const yaptirimAktif =
    !!profil?.restriction &&
    !!profil.restricted_until &&
    new Date(profil.restricted_until).getTime() > Date.now();

  const paylasimlar = tumGonderiler.filter((g) => g.repost_of && safMi(g));
  const kendiGonderileri = tumGonderiler.filter(
    (g) => !(g.repost_of && safMi(g))
  );

  const gosterilen =
    sekme === "gonderiler"
      ? kendiGonderileri
      : sekme === "paylasimlar"
      ? paylasimlar
      : begeniler;

  const bosMesaj =
    sekme === "gonderiler"
      ? "Henüz gönderi yok."
      : sekme === "paylasimlar"
      ? "Henüz yeniden paylaşım yok."
      : "Henüz tepki verilen gönderi yok.";

  const sekmeler: [Sekme, string, number][] = [
    ["gonderiler", "Gönderiler", kendiGonderileri.length],
    ["paylasimlar", "🔁 Paylaşımlar", paylasimlar.length],
    ["tepkiler", "💖 Tepkiler", begeniler.length],
  ];

  const kucukBtn =
    "rounded-full bg-card2 px-4 py-2 text-sm text-muted hover:text-ink";

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      {profil && (
        <div
          className="pointer-events-none fixed inset-0 -z-10"
          style={{ background: tema.sayfa }}
        />
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

      {profil && (
        <>
          <section className="overflow-hidden rounded-3xl border border-line bg-card">
            {profil.banner_url ? (
              <div
                className="h-28 bg-cover bg-center"
                style={{ backgroundImage: `url(${profil.banner_url})` }}
              />
            ) : (
              <div className="h-28" style={{ background: tema.banner }} />
            )}
            <div className="space-y-3 px-5 pb-5">
              <div className="-mt-10 flex items-end gap-4">
                <Avatar
                  url={profil.avatar_url}
                  ad={profil.username}
                  boyut="h-20 w-20 border-4 border-card text-3xl"
                  cerceve={profil.equipped_frame}
                />
                <div className="min-w-0 flex-1 pb-1">
                  <h2 className="truncate text-xl font-extrabold">
                    {profil.display_name || profil.username}
                  </h2>
                  <p className="text-sm text-muted">
                    @{profil.username}
                    {profil.role !== "fan" && (
                      <span className="ml-2 rounded-full bg-card2 px-2 py-0.5 text-xs text-brand">
                        {profil.role === "admin" ? "Admin" : "Sanatçı"}
                      </span>
                    )}
                    {profil.title && <UnvanRozeti ad={profil.title.name} />}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {profil.member_no && (
                  <span className="rounded-full bg-card2 px-3 py-1 font-semibold text-brand">
                    🎫 #{profil.member_no}. üye
                  </span>
                )}
                {yaptirimAktif && (
                  <span className="rounded-full bg-card2 px-3 py-1 font-semibold text-yellow-500">
                    {profil.restriction === "ban" ? "⛔ Yasaklı" : "🔇 Susturulmuş"}
                  </span>
                )}
                <span className="text-muted">
                  {new Date(profil.created_at).toLocaleDateString("tr-TR")}{" "}
                  tarihinde katıldı
                </span>
              </div>

              {profil.bio && (
                <p className="whitespace-pre-wrap text-sm">{profil.bio}</p>
              )}

              <div className="flex gap-5 text-sm">
                                <Link
                  href={`/profil/${profil.username}/takipciler`}
                  className="hover:text-brand"
                >
                  <b>{takipciSayisi}</b>{" "}
                  <span className="text-muted">takipçi</span>
                </Link>
                <Link
                  href={`/profil/${profil.username}/takip`}
                  className="hover:text-brand"
                >
                  <b>{takipSayisi}</b>{" "}
                  <span className="text-muted">takip</span>
                </Link>
                <span>
                  <b>{kendiGonderileri.length}</b>{" "}
                  <span className="text-muted">gönderi</span>
                </span>
              </div>

              {benimProfilim && !duzenle && (
                <div className="flex flex-wrap gap-2 text-sm">
                  <button
                    onClick={() => setDuzenle(true)}
                    className="btn-brand rounded-full px-4 py-2 font-semibold"
                  >
                    Profili düzenle
                  </button>
                  <Link
                    href="/ozellestir"
                    className="rounded-full bg-card2 px-4 py-2 font-semibold text-brand hover:opacity-80"
                  >
                    🎨 Özelleştir
                  </Link>
                  <Link
                    href="/gorevler"
                    className="rounded-full bg-card2 px-4 py-2 font-semibold text-brand hover:opacity-80"
                  >
                    🎯 Görevler
                  </Link>
                                    <Link href="/kaydedilenler" className={kucukBtn}>
                    🔖 Kaydedilenler
                  </Link>
                  <Link href="/engellenenler" className={kucukBtn}>
                    🚫 Engellenenler
                  </Link>
                </div>
              )}

              {!benimProfilim && (
                <div className="flex flex-wrap items-center gap-2">
                  {!engelli && (
                    <button
                      onClick={takipDegistir}
                      className={`rounded-full px-6 py-2 text-sm font-semibold ${
                        takipEdiyor
                          ? "bg-card2 text-muted hover:text-ink"
                          : "btn-brand"
                      }`}
                    >
                      {takipEdiyor ? "Takip ediliyor" : "Takip et"}
                    </button>
                  )}
                  {benimId && (
                    <button onClick={sessizDegistir} className={kucukBtn}>
                      {sessiz ? "🔊 Sesi aç" : "🔇 Sessize al"}
                    </button>
                  )}
                  {benimId && (
                    <button
                      onClick={engelDegistir}
                      className={`rounded-full bg-card2 px-4 py-2 text-sm ${
                        engelli
                          ? "text-red-400"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      {engelli ? "Engeli kaldır" : "🚫 Engelle"}
                    </button>
                  )}
                  {benimId && (
                    <button
                      onClick={() => setRaporAcik(!raporAcik)}
                      className={kucukBtn}
                    >
                      ⚑ Şikayet
                    </button>
                  )}
                </div>
              )}

              {raporAcik && benimId && !benimProfilim && (
                <SikayetFormu
                  hedefTuru="user"
                  hedefId={profil.id}
                  kullaniciId={benimId}
                  onKapat={() => setRaporAcik(false)}
                />
              )}
            </div>
          </section>

          {benimProfilim && duzenle && (
            <form
              onSubmit={kaydet}
              className="space-y-3 rounded-3xl border border-line bg-card p-4"
            >
              <input
                value={gorunenAd}
                onChange={(e) => setGorunenAd(e.target.value)}
                placeholder="Görünen ad"
                maxLength={40}
                className={alan}
              />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Biyografi"
                maxLength={200}
                rows={3}
                className={`${alan} resize-none`}
              />
              <label className="block cursor-pointer rounded-2xl bg-card2 px-3 py-3 text-sm text-muted hover:text-ink">
                📷{" "}
                {avatarDosya
                  ? avatarDosya.name.slice(0, 30)
                  : "Profil fotoğrafı seç (en fazla 2 MB)"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarDosya(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDuzenle(false);
                    setAvatarDosya(null);
                  }}
                  className="rounded-xl bg-card2 px-4 py-2 text-sm hover:opacity-80"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="btn-brand rounded-xl px-5 py-2 text-sm font-semibold"
                >
                  Kaydet
                </button>
              </div>
            </form>
          )}

          {engelli ? (
            <div className="rounded-3xl border border-dashed border-line py-10 text-center text-muted">
              <p className="text-4xl">🚫</p>
              <p className="mt-2 px-4">
                @{profil.username} kullanıcısını engelledin. Gönderileri
                gizleniyor.
              </p>
            </div>
          ) : (
            <>
              {sessiz && (
                <p className="rounded-2xl border border-line bg-card p-3 text-sm text-muted">
                  🔇 Bu kullanıcıyı sessize aldın, gönderileri ve yorumları
                  sana gösterilmiyor.
                </p>
              )}

              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                {sekmeler.map(([anahtar, etiket, sayi]) => (
                  <button
                    key={anahtar}
                    onClick={() => setSekme(anahtar)}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      sekme === anahtar
                        ? "btn-brand"
                        : "bg-card2 text-muted hover:text-ink"
                    }`}
                  >
                    {etiket} <span className="opacity-70">{sayi}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {gosterilen.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-line py-10 text-center text-muted">
                    <p className="text-4xl">🎶</p>
                    <p className="mt-2">{bosMesaj}</p>
                  </div>
                )}
                {gosterilen.map((g) => (
                  <PostCard
                    key={`${sekme}-${g.id}`}
                    gonderi={g}
                    kullaniciId={benimId}
                    admin={admin}
                    profilde
                    onYenile={yenile}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}