"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import PostCard, {
  Gonderi,
  GONDERI_SORGUSU,
  KATEGORILER,
  MAKS_FOTO,
  fotolariYukle,
  gonderiDuzenle,
} from "../../../components/PostCard";

type Grup = {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  debut_year: number | null;
  cover_url: string | null;
};

type Uye = {
  id: string;
  name: string;
  stage_name: string | null;
  birthday: string | null;
  bio: string | null;
  photo_url: string | null;
};

function turEtiketi(tur: string | null) {
  if (tur === "boyband") return "Boyband";
  if (tur === "girlband") return "Girlband";
  return "Karma";
}

export default function GrupIcerik() {
  const supabase = createClient();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [grup, setGrup] = useState<Grup | null>(null);
  const [uyeler, setUyeler] = useState<Uye[]>([]);
  const [kullaniciId, setKullaniciId] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [takipciSayisi, setTakipciSayisi] = useState(0);
  const [takipEdiyor, setTakipEdiyor] = useState(false);
  const [gonderiler, setGonderiler] = useState<Gonderi[]>([]);
  const [metin, setMetin] = useState("");
  const [kategori, setKategori] = useState("genel");
  const [dosyalar, setDosyalar] = useState<File[]>([]);
  const [paylasiliyor, setPaylasiliyor] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");

  async function verileriGetir(grupId: string, uid: string | null) {
    const { data: takipler } = await supabase
      .from("group_follows")
      .select("user_id")
      .eq("group_id", grupId);
    const liste = takipler || [];
    setTakipciSayisi(liste.length);
    setTakipEdiyor(uid ? liste.some((t) => t.user_id === uid) : false);

    const { data: uyeVeri } = await supabase
      .from("group_members")
      .select("id, name, stage_name, birthday, bio, photo_url")
      .eq("group_id", grupId)
      .order("created_at");
    setUyeler(uyeVeri || []);

    await gonderileriGetir(grupId);
  }

  async function gonderileriGetir(grupId: string) {
    const { data: posts, error } = await supabase
      .from("posts")
      .select(GONDERI_SORGUSU)
      .eq("group_id", grupId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) setHata(error.message);
    else
      setGonderiler(
        ((posts as unknown as Gonderi[]) || []).map(gonderiDuzenle)
      );
  }

  useEffect(() => {
    async function baslat() {
      const { data: kullanici } = await supabase.auth.getUser();
      const uid = kullanici.user?.id ?? null;
      setKullaniciId(uid);

      if (uid) {
        const { data: profil } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .single();
        setAdmin(profil?.role === "admin");
      }

      const { data: g, error } = await supabase
        .from("groups")
        .select("id, name, type, description, debut_year, cover_url")
        .eq("slug", slug)
        .single();

      if (error || !g) {
        setHata("Grup bulunamadı.");
      } else {
        setGrup(g);
        await verileriGetir(g.id, uid);
      }
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function takipDegistir() {
    if (!grup) return;
    if (!kullaniciId) {
      setHata("Takip etmek için giriş yapmalısın.");
      return;
    }
    setHata("");
    const { error } = takipEdiyor
      ? await supabase
          .from("group_follows")
          .delete()
          .eq("user_id", kullaniciId)
          .eq("group_id", grup.id)
      : await supabase
          .from("group_follows")
          .insert({ user_id: kullaniciId, group_id: grup.id });
    if (error) setHata(error.message);
    else await verileriGetir(grup.id, kullaniciId);
  }

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
    if (
      !grup ||
      !kullaniciId ||
      (!metin.trim() && dosyalar.length === 0) ||
      paylasiliyor
    )
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
      group_id: grup.id,
      category: kategori,
      content: metin.trim() || null,
      image_urls: yukleme.urls,
    });
    if (error) setHata(error.message);
    else {
      setMetin("");
      setDosyalar([]);
      setKategori("genel");
      await gonderileriGetir(grup.id);
    }
    setPaylasiliyor(false);
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 p-4">
        <div className="h-48 animate-pulse rounded-2xl border border-line bg-card" />
        <div className="h-24 animate-pulse rounded-2xl border border-line bg-card" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <Link href="/gruplar" className="text-sm text-muted hover:text-ink">
        ← Tüm gruplar
      </Link>

      {hata && (
        <p className="rounded-xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}

      {grup && (
        <>
          <section className="overflow-hidden rounded-2xl border border-line bg-card">
            {grup.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={grup.cover_url}
                alt={grup.name}
                className="h-44 w-full object-cover"
              />
            ) : (
              <div className="btn-brand flex h-44 items-center justify-center text-7xl font-extrabold opacity-90">
                {grup.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="space-y-2 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-extrabold">{grup.name}</h2>
                  <p className="text-sm text-brand">
                    {turEtiketi(grup.type)}
                    {grup.debut_year ? ` · ${grup.debut_year}` : ""}
                  </p>
                </div>
                <button
                  onClick={takipDegistir}
                  className={`shrink-0 rounded-full px-5 py-2 text-sm font-semibold ${
                    takipEdiyor
                      ? "bg-card2 text-muted hover:text-ink"
                      : "btn-brand"
                  }`}
                >
                  {takipEdiyor ? "Takip ediliyor" : "Takip et"}
                </button>
              </div>
              {grup.description && (
                <p className="text-sm text-muted">{grup.description}</p>
              )}
              <p className="text-xs text-muted">{takipciSayisi} takipçi</p>
            </div>
          </section>

          {uyeler.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-lg font-bold">Üyeler</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {uyeler.map((u) => (
                  <div
                    key={u.id}
                    className="overflow-hidden rounded-2xl border border-line bg-card"
                  >
                    {u.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={u.photo_url}
                        alt={u.name}
                        className="h-40 w-full object-cover"
                      />
                    ) : (
                      <div className="btn-brand flex h-40 items-center justify-center text-5xl font-extrabold opacity-90">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="space-y-0.5 p-3">
                      <p className="font-bold leading-tight">
                        {u.stage_name || u.name}
                      </p>
                      {u.stage_name && (
                        <p className="text-xs text-muted">{u.name}</p>
                      )}
                      {u.birthday && (
                        <p className="text-xs text-brand">
                          🎂{" "}
                          {new Date(u.birthday).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      )}
                      {u.bio && (
                        <p className="line-clamp-3 pt-1 text-xs text-muted">
                          {u.bio}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {kullaniciId && (
            <form
              onSubmit={paylas}
              className="space-y-3 rounded-2xl border border-line bg-card p-4"
            >
              <textarea
                value={metin}
                onChange={(e) => setMetin(e.target.value)}
                placeholder={`${grup.name} hakkında bir şey paylaş...`}
                maxLength={500}
                rows={3}
                className="w-full resize-none rounded-xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand"
              />

              {dosyalar.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {dosyalar.map((d, i) => (
                    <div key={`${d.name}-${i}`} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={URL.createObjectURL(d)}
                        alt={d.name}
                        className="h-20 w-20 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDosyalar(dosyalar.filter((_, k) => k !== i))
                        }
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/80 text-xs text-white"
                        aria-label="Kaldır"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {KATEGORILER.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKategori(k.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      kategori === k.id
                        ? "btn-brand"
                        : "bg-card2 text-muted hover:text-ink"
                    }`}
                  >
                    {k.ikon} {k.etiket}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="cursor-pointer rounded-lg bg-card2 px-3 py-2 text-sm text-muted hover:text-ink">
                  📷{" "}
                  {dosyalar.length > 0
                    ? `${dosyalar.length}/${MAKS_FOTO} fotoğraf`
                    : `Fotoğraf ekle (en fazla ${MAKS_FOTO})`}
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
                <button
                  type="submit"
                  disabled={
                    (!metin.trim() && dosyalar.length === 0) || paylasiliyor
                  }
                  className="btn-brand rounded-lg px-5 py-2 text-sm font-semibold"
                >
                  {paylasiliyor ? "Paylaşılıyor..." : "Paylaş"}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {gonderiler.length === 0 && (
              <div className="rounded-2xl border border-dashed border-line py-10 text-center text-muted">
                <p className="text-4xl">🎶</p>
                <p className="mt-2">Bu grup için henüz gönderi yok.</p>
              </div>
            )}
            {gonderiler.map((g) => (
              <PostCard
                key={g.id}
                gonderi={g}
                kullaniciId={kullaniciId}
                admin={admin}
                onYenile={() => gonderileriGetir(grup.id)}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}