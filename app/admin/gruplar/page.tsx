"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../../lib/supabase";

type Grup = {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  description: string | null;
  debut_year: number | null;
  cover_url: string | null;
};

function slugOlustur(metin: string) {
  return metin
    .trim()
    .replace(/İ/g, "i")
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminGruplarSayfasi() {
  const supabase = createClient();

  const [yukleniyor, setYukleniyor] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [gruplar, setGruplar] = useState<Grup[]>([]);
  const [ad, setAd] = useState("");
  const [tur, setTur] = useState("boyband");
  const [yil, setYil] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [kapak, setKapak] = useState<File | null>(null);
  const [hata, setHata] = useState("");
  const [basari, setBasari] = useState("");

  async function gruplariGetir() {
    const { data, error } = await supabase
      .from("groups")
      .select("id, name, slug, type, description, debut_year, cover_url")
      .order("name");
    if (error) setHata(error.message);
    else setGruplar(data || []);
  }

  useEffect(() => {
    async function baslat() {
      const { data: kullanici } = await supabase.auth.getUser();
      if (kullanici.user) {
        const { data: profil } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", kullanici.user.id)
          .single();
        setAdmin(profil?.role === "admin");
      }
      await gruplariGetir();
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function kapakYukle(slug: string, dosya: File) {
    const uzanti = dosya.name.split(".").pop()?.toLowerCase() || "jpg";
    const yol = `${slug}/${Date.now()}.${uzanti}`;
    const { error } = await supabase.storage
      .from("group-covers")
      .upload(yol, dosya);
    if (error) throw error;
    return supabase.storage.from("group-covers").getPublicUrl(yol).data
      .publicUrl;
  }

  async function grupEkle(e: React.FormEvent) {
    e.preventDefault();
    setHata("");
    setBasari("");

    const slug = slugOlustur(ad);
    if (!ad.trim() || !slug) {
      setHata("Geçerli bir grup adı yaz.");
      return;
    }
    if (kapak && kapak.size > 5 * 1024 * 1024) {
      setHata("Kapak görseli en fazla 5 MB olabilir.");
      return;
    }

    let kapakUrl: string | null = null;
    if (kapak) {
      try {
        kapakUrl = await kapakYukle(slug, kapak);
      } catch (err) {
        setHata(err instanceof Error ? err.message : "Kapak yüklenemedi.");
        return;
      }
    }

    const { error } = await supabase.from("groups").insert({
      name: ad.trim(),
      slug,
      type: tur,
      debut_year: yil ? parseInt(yil, 10) : null,
      description: aciklama.trim() || null,
      cover_url: kapakUrl,
    });

    if (error) {
      setHata(
        error.message.includes("duplicate")
          ? "Bu isimde bir grup zaten var."
          : error.message
      );
    } else {
      setBasari(`"${ad.trim()}" eklendi.`);
      setAd("");
      setYil("");
      setAciklama("");
      setKapak(null);
      await gruplariGetir();
    }
  }

  async function kapakDegistir(g: Grup, dosya: File) {
    setHata("");
    setBasari("");
    if (dosya.size > 5 * 1024 * 1024) {
      setHata("Kapak görseli en fazla 5 MB olabilir.");
      return;
    }
    try {
      const url = await kapakYukle(g.slug, dosya);
      const { error } = await supabase
        .from("groups")
        .update({ cover_url: url })
        .eq("id", g.id);
      if (error) throw error;
      setBasari(`"${g.name}" kapağı güncellendi.`);
      await gruplariGetir();
    } catch (err) {
      setHata(err instanceof Error ? err.message : "Kapak güncellenemedi.");
    }
  }

  async function grupSil(g: Grup) {
    if (!window.confirm(`"${g.name}" silinsin mi? Takipler de silinir.`)) return;
    setHata("");
    setBasari("");
    const { error } = await supabase.from("groups").delete().eq("id", g.id);
    if (error) setHata(error.message);
    else await gruplariGetir();
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <div className="h-40 animate-pulse rounded-2xl border border-line bg-card" />
      </main>
    );
  }

  if (!admin) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <p className="text-4xl">🔒</p>
        <p className="text-muted">Bu sayfa sadece adminler içindir.</p>
        <Link href="/" className="text-brand hover:underline">
          Ana sayfaya dön
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
            <div className="flex items-center justify-between">
        <h2 className="text-2xl font-extrabold">Grup yönetimi</h2>
        <Link href="/admin/uyeler" className="text-sm text-muted hover:text-ink">
          Üye yönetimi →
        </Link>
      </div>

      <form
        onSubmit={grupEkle}
        className="space-y-3 rounded-2xl border border-line bg-card p-4"
      >
        <input
          value={ad}
          onChange={(e) => setAd(e.target.value)}
          placeholder="Grup adı"
          required
          className="w-full rounded-xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand"
        />
        <div className="flex gap-3">
          <select
            value={tur}
            onChange={(e) => setTur(e.target.value)}
            className="flex-1 rounded-xl bg-card2 p-3 text-ink outline-none"
          >
            <option value="boyband">Boyband</option>
            <option value="girlband">Girlband</option>
            <option value="karma">Karma</option>
          </select>
          <input
            value={yil}
            onChange={(e) => setYil(e.target.value.replace(/\D/g, ""))}
            placeholder="Çıkış yılı"
            maxLength={4}
            className="w-32 rounded-xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand"
          />
        </div>
        <textarea
          value={aciklama}
          onChange={(e) => setAciklama(e.target.value)}
          placeholder="Kısa açıklama"
          rows={3}
          maxLength={500}
          className="w-full resize-none rounded-xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand"
        />
        <label className="block cursor-pointer rounded-xl bg-card2 px-3 py-3 text-sm text-muted hover:text-ink">
          🖼️ {kapak ? kapak.name.slice(0, 30) : "Kapak görseli seç (isteğe bağlı)"}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setKapak(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>
        {ad.trim() && (
          <p className="text-xs text-muted">Adres: /gruplar/{slugOlustur(ad)}</p>
        )}
        <button
          type="submit"
          className="btn-brand w-full rounded-xl p-3 font-semibold"
        >
          Grubu ekle
        </button>
      </form>

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

      <div className="space-y-2">
        <h3 className="text-sm text-muted">Mevcut gruplar ({gruplar.length})</h3>
        {gruplar.length === 0 && (
          <p className="text-sm text-muted">Henüz grup yok.</p>
        )}
        {gruplar.map((g) => (
          <div
            key={g.id}
            className="flex items-center gap-3 rounded-xl border border-line bg-card p-3"
          >
            {g.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={g.cover_url}
                alt={g.name}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="btn-brand flex h-12 w-12 items-center justify-center rounded-lg text-xl font-bold">
                {g.name.charAt(0).toUpperCase()}
              </div>
            )}
            <Link
              href={`/gruplar/${g.slug}`}
              className="min-w-0 flex-1 truncate hover:text-brand"
            >
              {g.name}
              <span className="ml-2 text-xs text-muted">
                {g.type}
                {g.debut_year ? ` · ${g.debut_year}` : ""}
              </span>
            </Link>
            <label className="cursor-pointer text-sm text-muted hover:text-ink">
              Kapak
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) kapakDegistir(g, f);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </label>
            <button
              onClick={() => grupSil(g)}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Sil
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}