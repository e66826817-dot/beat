"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../lib/supabase";

const SERBEST = ["/onay", "/belge", "/giris"];

export default function OnayKapisi() {
  const supabase = createClient();
  const router = useRouter();
  const yol = usePathname();
  const tamam = useRef(false);

  useEffect(() => {
    if (SERBEST.some((s) => yol.startsWith(s))) return;
    if (tamam.current) return;
    let iptal = false;
    (async () => {
      const { data: k } = await supabase.auth.getUser();
      if (!k.user || iptal) return;
      const { data, error } = await supabase.rpc("onay_durumu");
      if (error || iptal) return;
      if (data === true) tamam.current = true;
      else router.replace("/onay");
    })();
    return () => {
      iptal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yol]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      tamam.current = false;
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}