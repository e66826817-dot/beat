"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase";
import PostCard, {
  Gonderi,
  GONDERI_SORGUSU,
  gonderiDuzenle,
} from "../../../components/PostCard";

export default function GonderiSayfasi() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [gonderi, setGonderi] = useState<Gonderi | null>(null);
  const [kullaniciId, setKullaniciId] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");

  async function getir() {
    const { data, error } = await supabase
      .from("posts")
      .select(GONDERI_SORGUSU)
      .eq("id", id)
      .single();
    if (error || !data) setHata("Gönderi bulunamadı ya da silinmiş.");
    else setGonderi(gonderiDuzenle(data as unknown as Gonderi));
  }

  useEffect(() => {
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
  }, [id]);

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <div className="h-40 animate-pulse rounded-2xl border border-line bg-card" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <Link href="/" className="text-sm text-muted hover:text-ink">
        ← Ana sayfa
      </Link>

      {hata && (
        <div className="rounded-2xl border border-dashed border-line py-12 text-center text-muted">
          <p className="text-4xl">🫥</p>
          <p className="mt-2">{hata}</p>
        </div>
      )}

      {gonderi && (
        <PostCard
          gonderi={gonderi}
          kullaniciId={kullaniciId}
          admin={admin}
          detay
          onYenile={getir}
          onSilindi={() => router.push("/")}
        />
      )}
    </main>
  );
}