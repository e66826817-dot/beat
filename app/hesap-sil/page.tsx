"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";

const DEPOLAR = ["post-images", "avatars", "banners", "videos"];

export default function HesapSilSayfasi() {
  const supabase = createClient();
  const [uid, setUid] = useState<string | null>(null);
  const [kullanici, setKullanici] = useState("");
  const [onay, setOnay] = useState("");
  const [girisVar, setGirisVar] = useState(true);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [islem, setIslem] = useState(false);
  const [hata, setHata] = useState("");

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
        .select("username")
        .eq("id", k.user.id)
        .single();
      setKullanici(p?.username ?? "");
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sil() {
    if (!uid || islem || onay.trim() !== kullanici) return;
    setHata("");
    setIslem(true);

    const { error: kontrol } = await supabase.rpc("hesap_silme_kontrol");
    if (kontrol) {
      setHata(kontrol.message);
      setIslem(false);
      return;
    }

    // Yüklediğin dosyaları silmeyi dene (hata olursa devam eder)
    for (const depo of DEPOLAR) {
      try {
        const { data } = await supabase.storage
          .from(depo)
          .list(uid, { limit: 1000 });
        if (data && data.length > 0) {
          await supabase.storage
            .from(depo)
            .remove(data.map((f) => `${uid}/${f.name}`));
        }
      } catch {
        /* dosya silinemezse hesap silmeye devam edilir */
      }
    }

    const { error } = await supabase.rpc("hesabimi_sil");
    if (error) {
      setHata(error.message);
      setIslem(false);
      return;
    }
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <div className="h-40 animate-pulse rounded-3xl border border-line bg-card" />
      </main>
    );
  }

  if (!girisVar) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <p className="text-4xl">🔒</p>
        <p className="text-muted">Bu sayfa için giriş yapmalısın.</p>
        <Link href="/giris" className="text-brand hover:underline">
          Giriş yap
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <h2 className="text-2xl font-extrabold">Hesabımı sil</h2>

      <section className="space-y-2 rounded-3xl border border-red-500 bg-card p-5 text-sm">
        <p className="font-bold text-red-400">Bu işlem geri alınamaz.</p>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>
            Hesabın, profilin, gönderilerin, yorumların, videoların, notların,
            kanalların, ünvanların, görev ve puanların kalıcı olarak silinir.
          </li>
          <li>
            Yüklediğin fotoğraf ve videolar silinmeye çalışılır. Silinemeyen
            dosya kalırsa bize yazabilirsin.
          </li>
          <li>
            Yasal yükümlülükler gereği saklanması gereken kayıtlar ve yedekler
            makul bir süre kalabilir (Gizlilik Politikası&apos;na bak).
          </li>
          <li>Aynı kullanıcı adı ve e-posta ile yeniden kayıt olabilirsin.</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-3xl border border-line bg-card p-5">
        <p className="text-sm">
          Onaylamak için kullanıcı adını yaz: <b>{kullanici}</b>
        </p>
        <input
          value={onay}
          onChange={(e) => setOnay(e.target.value)}
          placeholder="Kullanıcı adın"
          className="w-full rounded-2xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand"
        />
        {hata && <p className="text-sm text-yellow-500">{hata}</p>}
        <button
          onClick={sil}
          disabled={onay.trim() !== kullanici || islem}
          className="w-full rounded-xl bg-red-600 p-3 font-semibold text-white disabled:opacity-40"
        >
          {islem ? "Siliniyor..." : "Hesabımı kalıcı olarak sil"}
        </button>
        <Link
          href={`/profil/${kullanici}`}
          className="block text-center text-sm text-muted hover:text-ink"
        >
          Vazgeç
        </Link>
      </section>
    </main>
  );
}