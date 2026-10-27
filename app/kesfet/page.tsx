"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";
import TakipOnerileri from "../../components/TakipOnerileri";

export default function KesfetSayfasi() {
  const supabase = createClient();
  const [uid, setUid] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUid(data.user?.id ?? null);
      setYukleniyor(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <div className="h-32 animate-pulse rounded-3xl border border-line bg-card" />
      </main>
    );
  }

  if (!uid) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <p className="text-4xl">👥</p>
        <p className="text-muted">Önerileri görmek için giriş yapmalısın.</p>
        <Link href="/giris" className="text-brand hover:underline">
          Giriş yap
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <div>
        <h2 className="text-2xl font-extrabold">👥 Keşfet</h2>
        <p className="text-sm text-muted">
          Ortak takip ettiklerine, aynı gruplara ve bu aralar aktif olanlara göre
          öneriler.
        </p>
      </div>
      <TakipOnerileri kullaniciId={uid} adet={30} liste />
    </main>
  );
}