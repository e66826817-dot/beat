"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "../../../../lib/supabase";
import PostCard, {
  Gonderi,
  GONDERI_SORGUSU,
  gonderiDuzenle,
} from "../../../../components/PostCard";

export default function AlintilarSayfasi() {
  const supabase = createClient();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [alintilar, setAlintilar] = useState<Gonderi[]>([]);
  const [orijinal, setOrijinal] = useState<{
    content: string | null;
    profiles: { username: string } | null;
  } | null>(null);
  const [kullaniciId, setKullaniciId] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");

  async function getir() {
    const { data, error } = await supabase
      .from("posts")
      .select(GONDERI_SORGUSU)
      .eq("repost_of", id)
      .not("content", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) setHata(error.message);
    else
      setAlintilar(((data as unknown as Gonderi[]) || []).map(gonderiDuzenle));
  }

  useEffect(() => {
    async function baslat() {
      const { data: k } = await supabase.auth.getUser();
      setKullaniciId(k.user?.id ?? null);
      if (k.user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", k.user.id)
          .single();
        setAdmin(p?.role === "admin");
      }
      const { data: o } = await supabase
        .from("posts")
        .select("content, profiles!posts_user_id_fkey(username)")
        .eq("id", id)
        .maybeSingle();
      setOrijinal(
        (o as unknown as {
          content: string | null;
          profiles: { username: string } | null;
        }) ?? null
      );
      await getir();
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl space-y-3 p-4">
        <div className="h-24 animate-pulse rounded-3xl border border-line bg-card" />
        <div className="h-28 animate-pulse rounded-3xl border border-line bg-card" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <Link
        href={`/gonderi/${id}`}
        className="text-sm text-muted hover:text-ink"
      >
        ← Gönderiye dön
      </Link>

      <section className="rounded-3xl border border-line bg-card p-4">
        <h2 className="text-xl font-extrabold">✍️ Alıntılar</h2>
        {orijinal && (
          <p className="mt-1 line-clamp-2 text-sm text-muted">
            @{orijinal.profiles?.username ?? "bilinmiyor"}:{" "}
            {orijinal.content ?? "(fotoğraflı gönderi)"}
          </p>
        )}
        <p className="mt-2 text-xs text-muted">{alintilar.length} alıntı</p>
      </section>

      {hata && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}

      {alintilar.length === 0 && !hata && (
        <div className="rounded-3xl border border-dashed border-line py-12 text-center text-muted">
          <p className="text-4xl">✍️</p>
          <p className="mt-2">Bu gönderiyi henüz kimse alıntılamadı.</p>
        </div>
      )}

      <div className="space-y-3">
        {alintilar.map((g) => (
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