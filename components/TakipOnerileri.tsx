"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase";
import { Avatar, hataCevir } from "./PostCard";

type Aday = {
  uid: string;
  ad: string;
  avatar: string | null;
  cerceve: string | null;
  bio: string | null;
  ortak_takip: number;
  ortak_grup: number;
  gonderi: number;
};

function sebep(a: Aday) {
  if (a.ortak_takip > 0) return `${a.ortak_takip} ortak takip`;
  if (a.ortak_grup > 0) return `${a.ortak_grup} ortak grup`;
  return "Bu aralar aktif";
}

export default function TakipOnerileri({
  kullaniciId,
  adet = 10,
  liste = false,
}: {
  kullaniciId: string | null;
  adet?: number;
  liste?: boolean;
}) {
  const supabase = createClient();
  const [adaylar, setAdaylar] = useState<Aday[] | null>(null);
  const [hata, setHata] = useState("");

  useEffect(() => {
    if (!kullaniciId) return;
    supabase.rpc("takip_onerileri", { adet }).then(({ data, error }) => {
      if (error) setHata(error.message);
      setAdaylar((data as Aday[]) || []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kullaniciId, adet]);

  async function takipEt(a: Aday) {
    if (!kullaniciId) return;
    setHata("");
    const { error } = await supabase
      .from("user_follows")
      .insert({ follower_id: kullaniciId, following_id: a.uid });
    if (error) {
      setHata(hataCevir(error.message));
      return;
    }
    setAdaylar((l) => (l ?? []).filter((x) => x.uid !== a.uid));
  }

  if (!kullaniciId || adaylar === null) return null;
  if (adaylar.length === 0) {
    return liste ? (
      <div className="rounded-3xl border border-dashed border-line py-12 text-center text-muted">
        <p className="text-4xl">👥</p>
        <p className="mt-2 px-4">Şu an önerecek kimse yok. Bir grubu takip et, öneriler gelsin!</p>
      </div>
    ) : null;
  }

    const kart = (a: Aday) => (
    <div
      key={a.uid}
      className={`rounded-2xl bg-card2 p-3 text-center ${
        liste ? "flex items-center gap-3 text-left" : "w-36 shrink-0 space-y-2"
      }`}
    >
      <Link
        href={`/profil/${a.ad}`}
        className={liste ? "flex min-w-0 flex-1 items-center gap-3" : "block"}
      >
        <div className={liste ? "" : "flex justify-center"}>
          <Avatar
            url={a.avatar}
            ad={a.ad}
            boyut={liste ? "h-11 w-11" : "h-14 w-14"}
            cerceve={a.cerceve}
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">@{a.ad}</p>
          <p className="truncate text-[11px] text-brand">{sebep(a)}</p>
          {liste && a.bio && (
            <p className="truncate text-xs text-muted">{a.bio}</p>
          )}
        </div>
      </Link>
      <button
        onClick={() => takipEt(a)}
        className={`btn-brand rounded-full px-4 py-1.5 text-xs font-semibold ${
          liste ? "shrink-0" : "w-full"
        }`}
      >
        Takip et
      </button>
    </div>
  );
  if (liste) {
    return (
      <div className="space-y-2">
        {hata && <p className="text-sm text-yellow-500">{hata}</p>}
        {adaylar.map((a) => (
          <div key={a.uid} className="rounded-3xl border border-line bg-card p-1">
            {kart(a)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-2 rounded-3xl border border-line bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">👥 Tanıyor olabileceğin kişiler</h3>
        <Link href="/kesfet" className="text-xs font-semibold text-brand">
          Daha fazla →
        </Link>
      </div>
      {hata && <p className="text-sm text-yellow-500">{hata}</p>}
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {adaylar.map(kart)}
      </div>
    </section>
  );
}