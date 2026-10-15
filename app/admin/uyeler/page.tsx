"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../../lib/supabase";

type Grup = { id: string; name: string };

type Uye = {
  id: string;
  group_id: string;
  name: string;
  stage_name: string | null;
  birthday: string | null;
  bio: string | null;
  photo_url: string | null;
};

export default function AdminUyelerSayfasi() {
  const supabase = createClient();

  const [yukleniyor, setYukleniyor] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [gruplar, setGruplar] = useState<Grup[]>([]);
  const [grupId, setGrupId] = useState("");
  const [uyeler, setUyeler] = useState<Uye[]>([]);

  const [ad, setAd] = useState("");
  const [sahneAdi, setSahneAdi] = useState("");
  const [dogum, setDogum] = useState("");
  const [bio, setBio] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [hata, setHata] = useState("");
  const [basari, setBasari] = useState("");

  async function uyeleriGetir(gid: string) {
    if (!gid) {
      setUyeler([]);
      return;
    }
    const { data, error } = await supabase
      .from("group_members")
      .select("id, group_id, name, stage_name, birthday, bio, photo_url")
      .eq("group_id", gid)
      .order("created_at");
    if (error) setHata(error.message);
    else setUyeler(data || []);
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
      const { data: g } = await supabase
        .from("groups")
        .select("id, name")
        .order("name");
      const liste = g || [];
      setGruplar(liste);
      if (liste.length > 0) {
        setGrupId(liste[0].id);
        await uyeleriGetir(liste[0].id);
      }
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function grupDegisti(id: string) {
    setGrupId(id);
    setHata("");
    setBasari("");
    await uyeleriGetir(id);
  }

  async function uyeEkle(e: React.FormEvent) {
    e.preventDefault();
    setHata("");
    setBasari("");
    if (!grupId || !ad.trim()) {
      setHata("Grup seç ve üye adını yaz.");
      return;
    }
    if (foto && foto.size > 3 * 1024 * 1024) {
      setHata("Fotoğraf en fazla 3 MB olabilir.");
      return;
    }

    let fotoUrl: string | null = null;
    if (foto) {
      const uzanti = foto.name.split(".").pop()?.toLowerCase() || "jpg";
      const yol = `${grupId}/${Date.now()}.${uzanti}`;
      const { error: yuklemeHatasi } = await supabase.storage
        .from("member-photos")
        .upload(yol, foto);
      if (yuklemeHatasi) {
        setHata(yuklemeHatasi.message);
        return;
      }
      fotoUrl = supabase.storage.from("member-photos").getPublicUrl(yol).data
        .publicUrl;
    }

    const { error } = await supabase.from("group_members").insert({
      group_id: grupId,
      name: ad.trim(),
      stage_name: sahneAdi.trim() || null,
      birthday: dogum || null,
      bio: bio.trim() || null,
      photo_url: fotoUrl,
    });

    if (error) {
      setHata(error.message);
    } else {
      setBasari(`"${ad.trim()}" eklendi.`);
      setAd("");
      setSahneAdi("");
      setDogum("");
      setBio("");
      setFoto(null);
      await uyeleriGetir(grupId);
    }
  }

  async function uyeSil(u: Uye) {
    if (!window.confirm(`"${u.name}" silinsin mi?`)) return;
    setHata("");
    setBasari("");
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("id", u.id);
    if (error) setHata(error.message);
    else await uyeleriGetir(grupId);
  }

  const alan =
    "w-full rounded-xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand";

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
        <h2 className="text-2xl font-extrabold">Üye yönetimi</h2>
        <Link
          href="/admin/gruplar"
          className="text-sm text-muted hover:text-ink"
        >
          Grup yönetimi →
        </Link>
      </div>

      {gruplar.length === 0 ? (
        <p className="rounded-xl border border-line bg-card p-4 text-sm text-muted">
          Önce Grup yönetimi sayfasından bir grup eklemelisin.
        </p>
      ) : (
        <>
          <select
            value={grupId}
            onChange={(e) => grupDegisti(e.target.value)}
            className={alan}
          >
            {gruplar.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          <form
            onSubmit={uyeEkle}
            className="space-y-3 rounded-2xl border border-line bg-card p-4"
          >
            <input
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              placeholder="Üye adı"
              required
              className={alan}
            />
            <input
              value={sahneAdi}
              onChange={(e) => setSahneAdi(e.target.value)}
              placeholder="Sahne adı (isteğe bağlı)"
              className={alan}
            />
            <div>
              <p className="mb-1 text-xs text-muted">Doğum günü (isteğe bağlı)</p>
              <input
                type="date"
                value={dogum}
                onChange={(e) => setDogum(e.target.value)}
                className={alan}
              />
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Kısa bilgi (isteğe bağlı)"
              rows={2}
              maxLength={300}
              className={`${alan} resize-none`}
            />
            <label className="block cursor-pointer rounded-xl bg-card2 px-3 py-3 text-sm text-muted hover:text-ink">
              📷 {foto ? foto.name.slice(0, 30) : "Fotoğraf seç (isteğe bağlı)"}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
            <button
              type="submit"
              className="btn-brand w-full rounded-xl p-3 font-semibold"
            >
              Üyeyi ekle
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
            <h3 className="text-sm text-muted">Üyeler ({uyeler.length})</h3>
            {uyeler.length === 0 && (
              <p className="text-sm text-muted">Bu grupta henüz üye yok.</p>
            )}
            {uyeler.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-card p-3"
              >
                {u.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={u.photo_url}
                    alt={u.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="btn-brand flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {u.name}
                    {u.stage_name && (
                      <span className="ml-2 text-xs text-muted">
                        ({u.stage_name})
                      </span>
                    )}
                  </p>
                  {u.birthday && (
                    <p className="text-xs text-muted">
                      {new Date(u.birthday).toLocaleDateString("tr-TR")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => uyeSil(u)}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Sil
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}