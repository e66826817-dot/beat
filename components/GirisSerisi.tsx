"use client";

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase";

export default function GirisSerisi() {
  const supabase = createClient();
  const [mesaj, setMesaj] = useState("");

  useEffect(() => {
    async function calis() {
      const { data: k } = await supabase.auth.getUser();
      if (!k.user) return;
      const anahtar = `beat-seri-${k.user.id}-${new Date().toDateString()}`;
      try {
        if (sessionStorage.getItem(anahtar)) return;
      } catch {}
      const { data, error } = await supabase.rpc("gunluk_giris");
      if (error) return;
      try {
        sessionStorage.setItem(anahtar, "1");
      } catch {}
      const s = (
        (data as { seri: number; yeni: boolean; kazanilan: number }[]) || []
      )[0];
      if (s?.yeni) {
        setMesaj(`🔥 ${s.seri} günlük seri! +${s.kazanilan} puan`);
        setTimeout(() => setMesaj(""), 4000);
      }
    }
    calis();
    const { data } = supabase.auth.onAuthStateChange((olay) => {
      if (olay === "SIGNED_IN") setTimeout(calis, 0);
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mesaj) return null;
  return (
    <div className="btn-brand fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-bold shadow-xl">
      {mesaj}
    </div>
  );
}