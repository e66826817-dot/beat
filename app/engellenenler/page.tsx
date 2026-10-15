"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import { Avatar, engelOnbellekSifirla } from "../../components/PostCard";

type Kisi = {
  kisi_id: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export default function EngellenenlerSayfasi() {
  const supabase = createClient();
  const [engelliler, setEngelliler] = useState<Kisi[]>([]);
  const [sessizler, setSessizler] = useState<Kisi[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [girisVar, setGirisVar] = useState(true);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");

  async function getir(kullaniciId: string) {
    const [b, m] = await Promise.all([
      supabase
        .from("blocks")
        .select(
          "blocked_id, profiles!blocks_blocked_id_fkey(username, display_name, avatar_url)"
        )
        .eq("blocker_id", kullaniciId)
        .order("created_at", { ascending: false }),
      supabase
        .from("mutes")
        .select(
          "muted_id, profiles!mutes_muted_id_fkey(username, display_name, avatar_url)"
        )
        .eq("muter_id", kullaniciId)
        .order("created_at", { ascending: false }),
    ]);

    if (b.error) setHata(b.error.message);
    if (m.error) setHata(m.error.message);

    setEngelliler(
      ((b.data as unknown as { blocked_id: string; profiles: Kisi["profiles"] }[]) || []).map(
        (x) => ({ kisi_id: x.blocked_id, profiles: x.profiles })
      )
    );
    setSessizler(
      ((m.data as unknown as { muted_id: string; profiles: Kisi["profiles"] }[]) || []).map(
        (x) => ({ kisi_id: x.muted_id, profiles: x.profiles })
      )
    );
  }

  useEffect(() => {
    async function baslat() {
      const { data: kullanici } = await supabase.auth.getUser();
      if (!kullanici.user) {
        setGirisVar(false);
        setYukleniyor(false);
        return;
      }
      setUid(kullanici.user.id);
      await getir(kullanici.user.id);
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function engelKaldir(id: string) {
    if (!uid) return;
    setHata("");
    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", uid)
      .eq("blocked_id", id);
    if (error) {
      setHata(error.message);
      return;
    }
    engelOnbellekSifirla();
    await getir(uid);
  }

  async function sessizKaldir(id: string) {
    if (!uid) return;
    setHata("");
    const { error } = await supabase
      .from("mutes")
      .delete()
      .eq("muter_id", uid)
      .eq("muted_id", id);
    if (error) {
      setHata(error.message);
      return;
    }
    engelOnbellekSifirla();
    await getir(uid);
  }

  function liste(
    kisiler: Kisi[],
    kaldir: (id: string) => void,
    etiket: string,
    bos: string
  ) {
    if (kisiler.length === 0) {
      return (
        <div className="rounded-3xl border border-dashed border-line py-8 text-center text-sm text-muted">
          {bos}
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {kisiler.map((e) => {
          const ad = e.profiles?.username ?? "bilinmiyor";
          return (
            <div
              key={e.kisi_id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3"
            >
              <Avatar url={e.profiles?.avatar_url} ad={ad} boyut="h-11 w-11" />
              <Link
                href={`/profil/${ad}`}
                className="min-w-0 flex-1 hover:text-brand"
              >
                <p className="truncate font-semibold">
                  {e.profiles?.display_name || ad}
                </p>
                <p className="truncate text-xs text-muted">@{ad}</p>
              </Link>
              <button
                onClick={() => kaldir(e.kisi_id)}
                className="rounded-full bg-card2 px-4 py-2 text-sm hover:opacity-80"
              >
                {etiket}
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <div className="h-24 animate-pulse rounded-3xl border border-line bg-card" />
      </main>
    );
  }

  if (!girisVar) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <p className="text-4xl">🚫</p>
        <p className="text-muted">Bu sayfa için giriş yapmalısın.</p>
        <Link href="/giris" className="text-brand hover:underline">
          Giriş yap
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-5 p-4">
      <div>
        <h2 className="text-2xl font-extrabold">Gizlenen kişiler</h2>
        <p className="text-sm text-muted">
          Engellediğin ve sessize aldığın kişilerin gönderileri ve yorumları
          senden gizlenir.
        </p>
      </div>

      {hata && (
        <p className="rounded-2xl border border-line bg-card p-3 text-sm text-yellow-500">
          {hata}
        </p>
      )}

      <section className="space-y-2">
        <h3 className="font-bold">🚫 Engellenenler ({engelliler.length})</h3>
        {liste(engelliler, engelKaldir, "Engeli kaldır", "Kimseyi engellemedin.")}
      </section>

      <section className="space-y-2">
        <h3 className="font-bold">🔇 Sessize alınanlar ({sessizler.length})</h3>
        {liste(sessizler, sessizKaldir, "Sesi aç", "Kimseyi sessize almadın.")}
      </section>
    </main>
  );
}