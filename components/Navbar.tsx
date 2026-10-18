"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "../lib/supabase";

type Yaptirim = { tur: string; bitis: string; sebep: string | null };

const ikonBtn =
  "flex h-10 w-10 items-center justify-center rounded-xl bg-card2 text-base transition hover:opacity-80";
const menuOge = "block w-full px-4 py-3 text-left hover:bg-card2";

export default function Navbar() {
  const supabase = createClient();
  const pathname = usePathname();
  const [kullaniciId, setKullaniciId] = useState<string | null>(null);
  const [kullaniciAdi, setKullaniciAdi] = useState<string | null>(null);
  const [admin, setAdmin] = useState(false);
  const [okunmamis, setOkunmamis] = useState(0);
  const [tema, setTema] = useState<"dark" | "light">("dark");
  const [menuAcik, setMenuAcik] = useState(false);
  const [yaptirim, setYaptirim] = useState<Yaptirim | null>(null);

  async function sayiGetir(uid: string | null) {
    if (!uid) {
      setOkunmamis(0);
      return;
    }
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .eq("is_read", false);
    setOkunmamis(count ?? 0);
  }

  useEffect(() => {
    setTema(
      document.documentElement.getAttribute("data-theme") === "light"
        ? "light"
        : "dark"
    );

    async function profilGetir(uid: string | null) {
      setKullaniciId(uid);
      if (!uid) {
        setKullaniciAdi(null);
        setAdmin(false);
        setYaptirim(null);
        setOkunmamis(0);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("username, role, restriction, restricted_until, restriction_reason")
        .eq("id", uid)
        .single();
      setKullaniciAdi(data?.username ?? null);
      setAdmin(data?.role === "admin");
      if (
        data?.restriction &&
        data.restricted_until &&
        new Date(data.restricted_until).getTime() > Date.now()
      ) {
        setYaptirim({
          tur: data.restriction,
          bitis: data.restricted_until,
          sebep: data.restriction_reason,
        });
      } else {
        setYaptirim(null);
      }
      await sayiGetir(uid);
    }

    supabase.auth
      .getUser()
      .then(({ data }) => profilGetir(data.user?.id ?? null));

    const { data: abonelik } = supabase.auth.onAuthStateChange(
      (_olay, oturum) => {
        setTimeout(() => profilGetir(oturum?.user?.id ?? null), 0);
      }
    );

    function okundu() {
      setOkunmamis(0);
    }
    window.addEventListener("bildirim-okundu", okundu);

    return () => {
      abonelik.subscription.unsubscribe();
      window.removeEventListener("bildirim-okundu", okundu);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setMenuAcik(false);
    if (kullaniciId && !pathname.startsWith("/bildirimler")) {
      sayiGetir(kullaniciId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, kullaniciId]);

  function temaDegistir() {
    const yeni = tema === "dark" ? "light" : "dark";
    setTema(yeni);
    document.documentElement.setAttribute("data-theme", yeni);
    try {
      localStorage.setItem("beat-tema", yeni);
    } catch {}
  }

  async function cikisYap() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (pathname.startsWith("/giris")) return null;

  const profilYolu = kullaniciAdi ? `/profil/${kullaniciAdi}` : "/giris";

  const linkler = [
    { href: "/", etiket: "Ana sayfa", ikon: "🏠", mobil: true },
    { href: "/gruplar", etiket: "Gruplar", ikon: "🎤", mobil: true },
    { href: "/ara", etiket: "Ara", ikon: "🔍", mobil: false },
    { href: "/etkinlikler", etiket: "Etkinlik", ikon: "📅", mobil: true },
    { href: "/anketler", etiket: "Anketler", ikon: "📊", mobil: true },
    { href: "/oyunlar", etiket: "Oyunlar", ikon: "🎮", mobil: false },
        { href: "/videolar", etiket: "Videolar", ikon: "🎬", mobil: false },
    {
      href: profilYolu,
      etiket: kullaniciAdi ? "Profil" : "Giriş",
      ikon: "👤",
      mobil: true,
    },
  ];

  function aktifMi(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const yaptirimMetni = yaptirim
    ? `${yaptirim.tur === "ban" ? "⛔ Hesabın yasaklandı" : "🔇 Hesabın susturuldu"}${
        new Date(yaptirim.bitis).getTime() > Date.now() + 50 * 365 * 86400000
          ? " (süresiz)"
          : ` (${new Date(yaptirim.bitis).toLocaleString("tr-TR")} tarihine kadar)`
      }. Bu sürede paylaşım, yorum ve tepki yapamazsın.${
        yaptirim.sebep ? ` Sebep: ${yaptirim.sebep}` : ""
      }`
    : null;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-page/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="text-2xl font-extrabold text-gradient">
            Beat
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {linkler
              .filter((l) => l.href !== "/ara")
              .map((l) => (
                <Link
                  key={l.etiket}
                  href={l.href}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    aktifMi(l.href)
                      ? "bg-card2 text-ink"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {l.etiket}
                </Link>
              ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/ara" aria-label="Ara" className={ikonBtn}>
              🔍
            </Link>
            {admin && (
              <Link
                href="/admin"
                aria-label="Yönetim paneli"
                className={`${ikonBtn} hidden md:flex`}
              >
                🛡️
              </Link>
            )}
            {kullaniciAdi && (
              <Link href="/gorevler" aria-label="Görevler" className={ikonBtn}>
                🎯
              </Link>
            )}
            {kullaniciAdi && (
              <Link
                href="/bildirimler"
                aria-label="Bildirimler"
                className={`${ikonBtn} relative`}
              >
                🔔
                {okunmamis > 0 && (
                  <span className="btn-brand absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold">
                    {okunmamis > 9 ? "9+" : okunmamis}
                  </span>
                )}
              </Link>
            )}

            <button
              onClick={temaDegistir}
              aria-label="Temayı değiştir"
              className={`${ikonBtn} hidden md:flex`}
            >
              {tema === "dark" ? "☀️" : "🌙"}
            </button>
            <div className="hidden md:block">
              {kullaniciAdi ? (
                <button
                  onClick={cikisYap}
                  className="rounded-xl bg-card2 px-4 py-2.5 text-sm text-muted hover:text-ink"
                >
                  Çıkış
                </button>
              ) : (
                <Link
                  href="/giris"
                  className="btn-brand rounded-xl px-5 py-2.5 text-sm font-semibold"
                >
                  Giriş yap
                </Link>
              )}
            </div>

            <button
              onClick={() => setMenuAcik(!menuAcik)}
              aria-label="Menü"
              className={`${ikonBtn} md:hidden`}
            >
              ☰
            </button>
          </div>
        </div>

        {yaptirimMetni && (
          <p className="border-t border-line bg-card2 px-4 py-2 text-center text-xs text-yellow-500">
            {yaptirimMetni}
          </p>
        )}
      </header>

      {menuAcik && (
        <div className="md:hidden">
          <button
            aria-label="Menüyü kapat"
            onClick={() => setMenuAcik(false)}
            className="fixed inset-0 z-50 cursor-default bg-black/30"
          />
          <div
            className="fixed right-3 z-50 w-60 overflow-hidden rounded-2xl border border-line bg-card text-sm shadow-xl"
            style={{ top: "calc(env(safe-area-inset-top) + 4.25rem)" }}
          >
            <Link href="/oyunlar" className={menuOge}>
              🎮 Oyunlar
            </Link>
                        <Link href="/videolar" className={menuOge}>
              🎬 Videolar
            </Link>
            {kullaniciAdi && (
              <Link href="/davet" className={menuOge}>
                📣 Arkadaşını davet et
              </Link>
            )}
            {kullaniciAdi && (
              <Link href="/ozellestir" className={menuOge}>
                🎨 Özelleştir
              </Link>
            )}
            {admin && (
              <Link href="/admin" className={menuOge}>
                🛡️ Yönetim paneli
              </Link>
            )}
            <button onClick={temaDegistir} className={menuOge}>
              {tema === "dark" ? "☀️ Açık tema" : "🌙 Koyu tema"}
            </button>
            {kullaniciAdi ? (
              <button onClick={cikisYap} className={`${menuOge} text-red-400`}>
                Çıkış yap
              </button>
            ) : (
              <Link href="/giris" className={`${menuOge} font-semibold text-brand`}>
                Giriş yap
              </Link>
            )}
          </div>
        </div>
      )}

      <nav className="nav-alt z-40 rounded-3xl border border-line bg-card/90 shadow-xl backdrop-blur-xl md:hidden">
        <div className="flex gap-1 p-1.5">
          {linkler
            .filter((l) => l.mobil)
            .map((l) => (
              <Link
                key={l.etiket}
                href={l.href}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-medium transition ${
                  aktifMi(l.href) ? "bg-card2 text-brand" : "text-muted"
                }`}
              >
                <span className="text-xl leading-none">{l.ikon}</span>
                {l.etiket}
              </Link>
            ))}
        </div>
      </nav>
    </>
  );
}