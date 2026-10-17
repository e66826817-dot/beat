"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { Avatar, UnvanRozeti } from "../../components/PostCard";
import { CERCEVELER, TEMALAR, temaBul } from "../../lib/kozmetik";
import UnvanYonetimi from "../../components/UnvanYonetimi";

type Profil = {
  id: string;
  username: string;
  role: string;
  avatar_url: string | null;
  profile_theme: string;
  equipped_frame: string | null;
  equipped_title_id: string | null;
  banner_url: string | null;
};

type Unvan = {
  id: string;
  key: string | null;
  name: string;
  is_system: boolean;
    is_private: boolean;
  creator_id: string | null;
  profiles: { username: string } | null;
};

type Gorev = { id: string; name: string; reward_type: string; reward_id: string };

const UNVAN_SORGUSU =
  "id, key, name, is_system, is_private, creator_id, profiles!titles_creator_id_fkey(username)";

export default function OzellestirSayfasi() {
  const supabase = createClient();
  const [profil, setProfil] = useState<Profil | null>(null);
  const [sahip, setSahip] = useState<Set<string>>(new Set());
  const [gorevler, setGorevler] = useState<Gorev[]>([]);
  const [unvanlar, setUnvanlar] = useState<Unvan[]>([]);
  const [yeniUnvan, setYeniUnvan] = useState("");
    const [izinli, setIzinli] = useState<Set<string>>(new Set());
  const [yukleniyor, setYukleniyor] = useState(true);
  const [girisVar, setGirisVar] = useState(true);
  const [hata, setHata] = useState("");
  const [basari, setBasari] = useState("");

   async function unvanlariGetir() {
    const { data } = await supabase
      .from("titles")
      .select(UNVAN_SORGUSU)
      .order("name")
      .limit(200);
    setUnvanlar((data as unknown as Unvan[]) || []);
    const { data: k } = await supabase.auth.getUser();
    if (k.user) {
      const { data: iz } = await supabase
        .from("title_allowed")
        .select("title_id")
        .eq("user_id", k.user.id);
      setIzinli(new Set((iz || []).map((x) => x.title_id)));
    }
  }

  useEffect(() => {
    async function baslat() {
      const { data: kullanici } = await supabase.auth.getUser();
      if (!kullanici.user) {
        setGirisVar(false);
        setYukleniyor(false);
        return;
      }
      const { data: p } = await supabase
        .from("profiles")
        .select(
          "id, username, role, avatar_url, profile_theme, equipped_frame, equipped_title_id, banner_url"
        )
        .eq("id", kullanici.user.id)
        .single();
      setProfil(p);

      const { data: oduller } = await supabase
        .from("user_rewards")
        .select("reward_type, reward_id")
        .eq("user_id", kullanici.user.id);
      setSahip(
        new Set((oduller || []).map((o) => `${o.reward_type}:${o.reward_id}`))
      );

      const { data: g } = await supabase
        .from("quests")
        .select("id, name, reward_type, reward_id");
      setGorevler(g || []);

      await unvanlariGetir();
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ipucu(tur: string, id: string) {
    const g = gorevler.find((x) => x.reward_type === tur && x.reward_id === id);
    return g ? `🔒 Görev: ${g.name}` : "🔒 Kilitli";
  }

  async function guncelle(alanlar: Partial<Profil>, mesaj: string) {
    if (!profil) return;
    setHata("");
    setBasari("");
    const { error } = await supabase
      .from("profiles")
      .update(alanlar)
      .eq("id", profil.id);
    if (error) {
      setHata(error.message);
      return false;
    }
    setProfil({ ...profil, ...alanlar });
    setBasari(mesaj);
    return true;
  }

  async function unvanOlustur(e: React.FormEvent) {
    e.preventDefault();
    if (!profil) return;
    const ad = yeniUnvan.trim();
    if (ad.length < 2 || ad.length > 20) {
      setHata("Ünvan 2 ile 20 karakter arasında olmalı.");
      return;
    }
    setHata("");
    setBasari("");
    const { error } = await supabase
      .from("titles")
      .insert({ name: ad, creator_id: profil.id });
    if (error) {
      setHata(
        error.code === "23505"
          ? "Bu isimde bir ünvan zaten var."
          : error.message.includes("row-level security")
          ? "Ünvan oluşturamadın: yetkin yok ya da en fazla 3 ünvan oluşturabilirsin."
          : error.message
      );
      return;
    }
    setYeniUnvan("");
    setBasari(`"${ad}" ünvanı oluşturuldu. Takan herkes için sana bildirim gelecek.`);
    await unvanlariGetir();
  }

  async function unvanSil(u: Unvan) {
    if (!window.confirm(`"${u.name}" ünvanı silinsin mi? Takan herkesten kalkar.`))
      return;
    setHata("");
    setBasari("");
    const { data, error } = await supabase
      .from("titles")
      .delete()
      .eq("id", u.id)
      .select("id");
    if (error || !data || data.length === 0) {
      setHata(error?.message ?? "Ünvan silinemedi.");
      return;
    }
    if (profil?.equipped_title_id === u.id) {
      setProfil({ ...profil, equipped_title_id: null });
    }
    await unvanlariGetir();
  }

  async function kapakYukle(dosya: File) {
    if (!profil) return;
    if (dosya.size > 3 * 1024 * 1024) {
      setHata("Kapak fotoğrafı en fazla 3 MB olabilir.");
      return;
    }
    setHata("");
    setBasari("");
    const uzanti = dosya.name.split(".").pop()?.toLowerCase() || "jpg";
    const yol = `${profil.id}/${Date.now()}.${uzanti}`;
    const { error } = await supabase.storage.from("banners").upload(yol, dosya);
    if (error) {
      setHata(error.message);
      return;
    }
    const url = supabase.storage.from("banners").getPublicUrl(yol).data.publicUrl;
    await guncelle({ banner_url: url }, "Kapak fotoğrafı güncellendi.");
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 p-4">
        <div className="h-48 animate-pulse rounded-2xl border border-line bg-card" />
        <div className="h-32 animate-pulse rounded-2xl border border-line bg-card" />
      </main>
    );
  }

  if (!girisVar || !profil) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <p className="text-4xl">🎨</p>
        <p className="text-muted">Özelleştirmek için giriş yapmalısın.</p>
        <Link href="/giris" className="text-brand hover:underline">
          Giriş yap
        </Link>
      </main>
    );
  }

  const tema = temaBul(profil.profile_theme);
  const takiliUnvan = unvanlar.find((u) => u.id === profil.equipped_title_id);
  const adminMi = profil.role === "admin";
  const kendiUnvanlari = unvanlar.filter((u) => u.creator_id === profil.id);
  const sistemUnvanlari = unvanlar.filter(
    (u) => u.is_system && sahip.has(`title:${u.key}`)
  );
  const kullaniciUnvanlari = unvanlar.filter(
    (u) =>
      !u.is_system &&
      (!u.is_private ||
        u.creator_id === profil.id ||
        izinli.has(u.id) ||
        adminMi)
  );
  const unvanOlusturabilir = sahip.has("ability:create_title");
  const kapakYetkisi = sahip.has("ability:banner_upload");

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold">🎨 Özelleştir</h2>
        <div className="flex gap-3 text-sm text-muted">
          <Link href="/gorevler" className="hover:text-ink">
            🎯 Görevler
          </Link>
          <Link href={`/profil/${profil.username}`} className="hover:text-ink">
            Profilim
          </Link>
        </div>
      </div>

      {hata && (
        <p className="rounded-xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}
      {basari && (
        <p className="rounded-xl border border-line bg-card p-3 text-sm text-green-500">
          {basari}
        </p>
      )}

      {/* Önizleme */}
      <section className="overflow-hidden rounded-2xl border border-line bg-card">
        {profil.banner_url ? (
          <div
            className="h-24 bg-cover bg-center"
            style={{ backgroundImage: `url(${profil.banner_url})` }}
          />
        ) : (
          <div className="h-24" style={{ background: tema.banner }} />
        )}
        <div className="-mt-9 flex items-end gap-3 px-5 pb-5">
          <Avatar
            url={profil.avatar_url}
            ad={profil.username}
            boyut="h-16 w-16 border-4 border-card text-2xl"
            cerceve={profil.equipped_frame}
          />
          <div className="min-w-0 pb-1">
            <p className="truncate font-extrabold">@{profil.username}</p>
            {takiliUnvan && <UnvanRozeti ad={takiliUnvan.name} />}
          </div>
        </div>
      </section>

      {/* Tema */}
      <section className="space-y-3 rounded-2xl border border-line bg-card p-4">
        <h3 className="font-bold">Profil teması</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TEMALAR.map((t) => {
            const acik = t.ucretsiz || sahip.has(`theme:${t.id}`);
            const secili = profil.profile_theme === t.id;
            return (
              <button
                key={t.id}
                disabled={!acik}
                onClick={() => guncelle({ profile_theme: t.id }, `Tema: ${t.ad}`)}
                className={`overflow-hidden rounded-xl border text-left transition ${
                  secili ? "border-brand ring-2 ring-brand" : "border-line"
                } ${acik ? "hover:-translate-y-0.5" : "opacity-60"}`}
              >
                <div className="h-14" style={{ background: t.banner }} />
                <div className="p-2">
                  <p className="text-sm font-semibold">{t.ad}</p>
                  <p className="text-xs text-muted">
                    {acik ? (secili ? "✓ Takılı" : "Seç") : ipucu("theme", t.id)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Çerçeve */}
      <section className="space-y-3 rounded-2xl border border-line bg-card p-4">
        <h3 className="font-bold">Avatar çerçevesi</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            onClick={() => guncelle({ equipped_frame: null }, "Çerçeve kaldırıldı.")}
            className={`flex flex-col items-center gap-2 rounded-xl border p-3 ${
              !profil.equipped_frame ? "border-brand ring-2 ring-brand" : "border-line"
            }`}
          >
            <Avatar url={profil.avatar_url} ad={profil.username} boyut="h-14 w-14" />
            <span className="text-xs font-semibold">Çerçevesiz</span>
          </button>
          {CERCEVELER.map((c) => {
            const acik = sahip.has(`frame:${c.id}`);
            const secili = profil.equipped_frame === c.id;
            return (
              <button
                key={c.id}
                disabled={!acik}
                onClick={() => guncelle({ equipped_frame: c.id }, `Çerçeve: ${c.ad}`)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition ${
                  secili ? "border-brand ring-2 ring-brand" : "border-line"
                } ${acik ? "hover:-translate-y-0.5" : "opacity-60"}`}
              >
                <Avatar
                  url={profil.avatar_url}
                  ad={profil.username}
                  boyut="h-14 w-14"
                  cerceve={c.id}
                />
                <span className="text-xs font-semibold">{c.ad}</span>
                {!acik && (
                  <span className="text-center text-[11px] text-muted">
                    {ipucu("frame", c.id)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Ünvan */}
      <section className="space-y-3 rounded-2xl border border-line bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Ünvan</h3>
          {profil.equipped_title_id && (
            <button
              onClick={() => guncelle({ equipped_title_id: null }, "Ünvan çıkarıldı.")}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Ünvanı çıkar
            </button>
          )}
        </div>

        {sistemUnvanlari.length === 0 && kullaniciUnvanlari.length === 0 && (
          <p className="text-sm text-muted">
            Henüz takabileceğin ünvan yok. Görevleri tamamlayarak ünvan kazan.
          </p>
        )}

        {sistemUnvanlari.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold text-muted">Kazandıkların</p>
            <div className="flex flex-wrap gap-2">
              {sistemUnvanlari.map((u) => (
                <button
                  key={u.id}
                  onClick={() => guncelle({ equipped_title_id: u.id }, `Ünvan: ${u.name}`)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                    profil.equipped_title_id === u.id
                      ? "btn-brand"
                      : "bg-card2 hover:ring-2 hover:ring-brand"
                  }`}
                >
                  ✦ {u.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {kullaniciUnvanlari.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold text-muted">
              Topluluğun oluşturduğu ünvanlar
            </p>
            <div className="flex flex-wrap gap-2">
              {kullaniciUnvanlari.map((u) => (
                <span key={u.id} className="inline-flex items-center gap-1">
                  <button
                    onClick={() =>
                      guncelle({ equipped_title_id: u.id }, `Ünvan: ${u.name}`)
                    }
                    title={`@${u.profiles?.username ?? "bilinmiyor"} oluşturdu`}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                      profil.equipped_title_id === u.id
                        ? "btn-brand"
                        : "bg-card2 hover:ring-2 hover:ring-brand"
                    }`}
                  >
                    ✦ {u.name}
                    <span className="ml-1 text-[11px] font-normal opacity-70">
                      @{u.profiles?.username ?? "?"}
                    </span>
                  </button>
                  {adminMi && u.creator_id !== profil.id && (
                    <button
                      onClick={() => unvanSil(u)}
                      className="text-xs text-red-400 hover:text-red-300"
                      aria-label="Ünvanı sil (admin)"
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

           <UnvanYonetimi
        profilId={profil.id}
        olusturabilir={unvanOlusturabilir}
        ipucu={ipucu("ability", "create_title")}
        onDegisti={unvanlariGetir}
      />

      {/* Özel kapak */}
      <section className="space-y-3 rounded-2xl border border-line bg-card p-4">
        <h3 className="font-bold">Özel kapak fotoğrafı</h3>
        {kapakYetkisi ? (
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-xl bg-card2 px-4 py-2.5 text-sm text-muted hover:text-ink">
              🖼️ Fotoğraf seç (en fazla 3 MB)
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) kapakYukle(f);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </label>
            {profil.banner_url && (
              <button
                onClick={() => guncelle({ banner_url: null }, "Kapak fotoğrafı kaldırıldı.")}
                className="rounded-xl bg-card2 px-4 py-2.5 text-sm text-red-400 hover:opacity-80"
              >
                Kaldır
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">{ipucu("ability", "banner_upload")}</p>
        )}
      </section>
    </main>
  );
}