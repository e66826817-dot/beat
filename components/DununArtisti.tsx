"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase";

type Aday = { ad: string; oy: number };

export default function DunUnArtisti() {
  const supabase = createClient();
  const [dun, setDun] = useState<Aday | null>(null);

  useEffect(() => {
    supabase.rpc("artist_siralama", { gun_farki: 1 }).then(({ data }) => {
      const ilk = ((data as Aday[]) || [])[0];
      setDun(ilk && ilk.oy > 0 ? ilk : null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Link
      href="/artist"
      className="flex items-center gap-3 rounded-3xl border border-line bg-card p-4 transition hover:-translate-y-0.5"
    >
      <span className="text-3xl">⭐</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-muted">Günün artisti</p>
        <p className="truncate font-bold">
          {dun ? `Dünün artisti: ${dun.ad}` : "Bugünün artistini sen seç"}
        </p>
      </div>
      <span className="text-sm font-semibold text-brand">Oy ver →</span>
    </Link>
  );
}