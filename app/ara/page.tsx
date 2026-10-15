"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";

type GrupSonuc = {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  cover_url: string | null;
};

type UyeSonuc = {
  id: string;
  name: string;
  stage_name: string | null;
  photo_url: string | null;
  groups: { name: string; slug: string } | null;
};

type KullaniciSonuc = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

function turEtiketi(tur: string | null) {
  if (tur === "boyband") return "Boyband";
  if (tur === "girlband") return "Girlband";
  return "Karma";
}

function Avatar({ url, ad }: { url: string | null; ad: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={ad} className="h-11 w-11 shrink-0 rounded-full object-cover" />
    );
  }
  return (
    <div className="btn-brand flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold">
      {ad.charAt(0).toUpperCase()}
    </div>
  );
}

export default function AramaSayfasi() {
  const supabase = createClient();

  const [sorgu, setSorgu] = useState("");
  const [gruplar, setGruplar] = useState<GrupSonuc[]>([]);
  const [uyeler, setUyeler] = useState<UyeSonuc[]>([]);
  const [kullanicilar, setKullanicilar] = useState<KullaniciSonuc[]>([]);
  const [araniyor, setAraniyor] = useState(false);
  const [arandi, setArandi] = useState(false);
  const [hata, setHata] = useState("");

  useEffect(() => {
    // % _ , ( ) karakterleri sorguyu bozmasın diye temizle
    const temiz = sorgu.trim().replace(/[%_,()\\]/g, " ").trim();

    if (temiz.length < 2) {
      setGruplar([]);
      setUyeler([]);
      setKullanicilar([]);
      setArandi(false);
      setHata("");
      return;
    }

    const zamanlayici = setTimeout(async () => {
      setAraniyor(true);
      setHata("");
      const kalip = `%${temiz}%`;

      // Engellenen kullanıcıları sonuçlardan çıkar
      const { data: oturum } = await supabase.auth.getUser();
      let engelliIdler: string[] = [];
      if (oturum.user) {
        const { data: e } = await supabase
          .from("blocks")
          .select("blocked_id")
          .eq("blocker_id", oturum.user.id);
        engelliIdler = (e || []).map((x) => x.blocked_id);
      }

      const [g, u, k] = await Promise.all([
        supabase
          .from("groups")
          .select("id, name, slug, type, cover_url")
          .ilike("name", kalip)
          .order("name")
          .limit(10),
        supabase
          .from("group_members")
          .select(
            "id, name, stage_name, photo_url, groups!group_members_group_id_fkey(name, slug)"
          )
          .or(`name.ilike.${kalip},stage_name.ilike.${kalip}`)
          .limit(10),
        supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .or(`username.ilike.${kalip},display_name.ilike.${kalip}`)
          .limit(20),
      ]);

      const ilkHata = g.error || u.error || k.error;
      if (ilkHata) setHata(ilkHata.message);

      setGruplar(g.data || []);
      setUyeler((u.data as unknown as UyeSonuc[]) || []);
      setKullanicilar(
        (k.data || []).filter((x) => !engelliIdler.includes(x.id)).slice(0, 10)
      );
      setArandi(true);
      setAraniyor(false);
    }, 350);

    return () => clearTimeout(zamanlayici);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorgu]);

  const toplam = gruplar.length + uyeler.length + kullanicilar.length;

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <div>
        <h2 className="text-2xl font-extrabold">Ara</h2>
        <p className="text-sm text-muted">
          Grup, üye veya kullanıcı ara.
        </p>
      </div>

      <input
        value={sorgu}
        onChange={(e) => setSorgu(e.target.value)}
        placeholder="🔍 En az 2 harf yaz..."
        autoFocus
        className="w-full rounded-xl border border-line bg-card p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand"
      />

      {araniyor && <p className="text-sm text-muted">Aranıyor...</p>}

      {hata && (
        <p className="rounded-xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}

      {arandi && !araniyor && toplam === 0 && !hata && (
        <div className="rounded-2xl border border-dashed border-line py-12 text-center text-muted">
          <p className="text-4xl">🔍</p>
          <p className="mt-2 px-4">&quot;{sorgu.trim()}&quot; için sonuç bulunamadı.</p>
        </div>
      )}

      {gruplar.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted">Gruplar</h3>
          {gruplar.map((g) => (
            <Link
              key={g.id}
              href={`/gruplar/${g.slug}`}
              className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 transition hover:-translate-y-0.5"
            >
              <Avatar url={g.cover_url} ad={g.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{g.name}</p>
                <p className="text-xs text-brand">{turEtiketi(g.type)}</p>
              </div>
            </Link>
          ))}
        </section>
      )}

      {uyeler.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted">Üyeler</h3>
          {uyeler.map((u) => (
            <Link
              key={u.id}
              href={u.groups ? `/gruplar/${u.groups.slug}` : "/gruplar"}
              className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 transition hover:-translate-y-0.5"
            >
              <Avatar url={u.photo_url} ad={u.stage_name || u.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {u.stage_name || u.name}
                </p>
                <p className="truncate text-xs text-muted">
                  {u.stage_name ? `${u.name} · ` : ""}
                  {u.groups?.name ?? ""}
                </p>
              </div>
            </Link>
          ))}
        </section>
      )}

      {kullanicilar.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-muted">Kullanıcılar</h3>
          {kullanicilar.map((k) => (
            <Link
              key={k.id}
              href={`/profil/${k.username}`}
              className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 transition hover:-translate-y-0.5"
            >
              <Avatar url={k.avatar_url} ad={k.username} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {k.display_name || k.username}
                </p>
                <p className="truncate text-xs text-muted">@{k.username}</p>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}