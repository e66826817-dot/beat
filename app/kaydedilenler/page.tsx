"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import PostCard, {
  Gonderi,
  GONDERI_SORGUSU,
  gonderiDuzenle,
} from "../../components/PostCard";

export default function KaydedilenlerSayfasi() {
  const supabase = createClient();
  const [gonderiler, setGonderiler] = useState<Gonderi[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [girisVar, setGirisVar] = useState(true);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");

  async function getir(kullaniciId: string) {
    const { data: b } = await supabase
      .from("bookmarks")
      .select("post_id")
      .eq("user_id", kullaniciId)
      .order("created_at", { ascending: false })
      .limit(100);
    const idler = (b || []).map((x) => x.post_id);
    if (idler.length === 0) {
      setGonderiler([]);
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
    liste.sort((a, c) => idler.indexOf(a.id) - idler.indexOf(c.id));
    setGonderiler(liste);
  }

  useEffect(() => {
    async function baslat() {
      const { data: k } = await supabase.auth.getUser();
      if (!k.user) {
        setGirisVar(false);
        setYukleniyor(false);
        return;
      }
      setUid(k.user.id);
      const { data: p } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", k.user.id)
        .single();
      setAdmin(p?.role === "admin");
      await getir(k.user.id);
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 p-4">
        <div className="h-28 animate-pulse rounded-3xl border border-line bg-card" />
      </main>
    );
  }

  if (!girisVar) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <p className="text-4xl">🔖</p>
        <p className="text-muted">Kaydettiklerini görmek için giriş yapmalısın.</p>
        <Link href="/giris" className="text-brand hover:underline">
          Giriş yap
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <div>
        <h2 className="text-2xl font-extrabold">🔖 Kaydedilenler</h2>
        <p className="text-sm text-muted">
          Kaydettiğin gönderiler burada. Kartta &quot;🔖 Kayıtlı&quot; yazanlar
          kayıtlıdır.
        </p>
      </div>

      {hata && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}

      {gonderiler.length === 0 && !hata && (
        <div className="rounded-3xl border border-dashed border-line py-12 text-center text-muted">
          <p className="text-4xl">🔖</p>
          <p className="mt-2 px-4">Henüz gönderi kaydetmedin.</p>
        </div>
      )}

      <div className="space-y-3">
        {gonderiler.map((g) => (
          <PostCard
            key={g.id}
            gonderi={g}
            kullaniciId={uid}
            admin={admin}
            onYenile={() => (uid ? getir(uid) : Promise.resolve())}
          />
        ))}
      </div>
    </main>
  );
}