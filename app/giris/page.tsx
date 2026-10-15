"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";

export default function GirisSayfasi() {
  const supabase = createClient();
  const router = useRouter();

  const [kayitModu, setKayitModu] = useState(false);
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [kullaniciAdi, setKullaniciAdi] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setYukleniyor(true);
    setMesaj("");

    if (kayitModu) {
      const ad = kullaniciAdi.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(ad)) {
        setMesaj(
          "Kullanıcı adı 3-20 karakter olmalı; sadece küçük harf (a-z, Türkçe karakter yok), rakam ve _ kullanılabilir."
        );
        setYukleniyor(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: sifre,
        options: { data: { username: ad } },
      });

      if (error) {
        setMesaj(
          error.message.includes("Database error")
            ? "Bu kullanıcı adı zaten alınmış, başka bir tane dene."
            : error.message
        );
      } else if (!data.session) {
        setMesaj("Kayıt başarılı! E-postanı doğrulaman gerekebilir.");
      } else {
        router.push("/");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: sifre,
      });

      if (error) {
        setMesaj(
          error.message.includes("Invalid login")
            ? "E-posta veya şifre hatalı."
            : error.message
        );
      } else {
        router.push("/");
        router.refresh();
      }
    }

    setYukleniyor(false);
  }

  const alan =
    "w-full rounded-xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand";

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={gonder}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-card p-8 shadow-lg"
      >
        <Link href="/" className="block text-center text-4xl font-extrabold text-gradient">
          Beat
        </Link>
        <p className="text-center text-muted">
          {kayitModu ? "Hesap oluştur" : "Tekrar hoş geldin"}
        </p>

        {kayitModu && (
          <input
            type="text"
            placeholder="Kullanıcı adı (örn: beatfan)"
            value={kullaniciAdi}
            onChange={(e) => setKullaniciAdi(e.target.value)}
            required
            className={alan}
          />
        )}

        <input
          type="email"
          placeholder="E-posta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={alan}
        />

        <input
          type="password"
          placeholder="Şifre (en az 6 karakter)"
          value={sifre}
          onChange={(e) => setSifre(e.target.value)}
          required
          minLength={6}
          className={alan}
        />

        <button
          type="submit"
          disabled={yukleniyor}
          className="btn-brand w-full rounded-xl p-3 font-semibold"
        >
          {yukleniyor ? "Bekle..." : kayitModu ? "Kayıt ol" : "Giriş yap"}
        </button>

        {mesaj && <p className="text-center text-sm text-yellow-500">{mesaj}</p>}

        <button
          type="button"
          onClick={() => {
            setKayitModu(!kayitModu);
            setMesaj("");
          }}
          className="w-full text-sm text-muted hover:text-ink"
        >
          {kayitModu
            ? "Zaten hesabın var mı? Giriş yap"
            : "Hesabın yok mu? Kayıt ol"}
        </button>
      </form>
    </main>
  );
}