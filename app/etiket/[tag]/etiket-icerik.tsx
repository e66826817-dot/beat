"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import PostCard, {
  Gonderi,
  GONDERI_SORGUSU,
  gonderiDuzenle,
} from "../../../components/PostCard";

export default function EtiketIcerik() {
  const supabase = createClient();
  const params = useParams<{ tag: string }>();
  const etiket = params?.tag ? decodeURIComponent(params.tag).toLowerCase() : "";

  const [gonderiler, setGonderiler] = useState<Gonderi[]>([]);
  const [kullaniciId, setKullaniciId] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");

  async function getir() {
    const temiz = etiket.replace(/[^\p{L}\p{N}_]/gu, "");
    if (!temiz) {
      setGonderiler([]);
      return;
    }
    const { data, error } = await supabase
      .from("posts")
      .select(GONDERI_SORGUSU)
      .ilike("content", `%#${temiz}%`)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setHata(error.message);
      return;
    }
    const kesin = new RegExp(`#${temiz}(?![\\p{L}\\p{N}_])`, "iu");
    setGonderiler(
      ((data as unknown as Gonderi[]) || [])
        .filter((g) => g.content && kesin.test(g.content))
        .map(gonderiDuzenle)
    );
  }

  useEffect(() => {
    if (!etiket) return;
    async function baslat() {
      const { data: kullanici } = await supabase.auth.getUser();
      setKullaniciId(kullanici.user?.id ?? null);
      if (kullanici.user) {
        const { data: profil } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", kullanici.user.id)
          .single();
        setAdmin(profil?.role === "admin");
      }
      await getir();
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etiket]);

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 p-4">
        <div className="h-24 animate-pulse rounded-2xl border border-line bg-card" />
        <div className="h-28 animate-pulse rounded-2xl border border-line bg-card" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <Link href="/" className="text-sm text-muted hover:text-ink">
        ← Ana sayfa
      </Link>

      <section className="btn-brand rounded-2xl p-6">
        <h2 className="text-3xl font-extrabold">#{etiket}</h2>
        <p className="mt-1 text-sm opacity-90">{gonderiler.length} gönderi</p>
      </section>

      {hata && (
        <p className="rounded-xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}

      {gonderiler.length === 0 && !hata && (
        <div className="rounded-2xl border border-dashed border-line py-12 text-center text-muted">
          <p className="text-4xl">#️⃣</p>
          <p className="mt-2 px-4">
            Bu etiketle henüz gönderi yok. Bir gönderide #{etiket} yazarak ilk
            paylaşımı sen yap!
          </p>
        </div>
      )}

      <div className="space-y-3">
        {gonderiler.map((g) => (
          <PostCard
            key={g.id}
            gonderi={g}
            kullaniciId={kullaniciId}
            admin={admin}
            onYenile={getir}
          />
        ))}
      </div>
    </main>
  );
}