"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase";

type Yetkili = { id: string; username: string; role: string };
type Yaptirim = {
  id: string;
  username: string;
  restriction: string;
  restricted_until: string;
  restriction_reason: string | null;
};

const BAGLANTILAR = [
  { href: "/admin/sikayetler", ad: "Şikayetler", ikon: "🚩" },
  { href: "/admin/gruplar", ad: "Gruplar", ikon: "🎤" },
  { href: "/admin/uyeler", ad: "Grup üyeleri", ikon: "👥" },
  { href: "/admin/anketler", ad: "Anketler", ikon: "📊" },
  { href: "/admin/soru", ad: "Günün sorusu", ikon: "💭" },
    { href: "/admin/yasakli-kelimeler", ad: "Yasaklı kelimeler", ikon: "🚫" },
];

const ROL_ETIKET: Record<string, string> = {
  admin: "Admin",
  artist: "Sanatçı",
  fan: "Hayran",
};

const SURELER = [
  { saat: 1, etiket: "1 saat" },
  { saat: 24, etiket: "1 gün" },
  { saat: 168, etiket: "7 gün" },
  { saat: 720, etiket: "30 gün" },
  { saat: 0, etiket: "Süresiz" },
];

export default function AdminSayfasi() {
  const supabase = createClient();
  const [yukleniyor, setYukleniyor] = useState(true);
  const [admin, setAdmin] = useState(false);
  const [benimId, setBenimId] = useState<string | null>(null);
  const [yetkililer, setYetkililer] = useState<Yetkili[]>([]);
  const [yaptirimlar, setYaptirimlar] = useState<Yaptirim[]>([]);

  const [kullanici, setKullanici] = useState("");
  const [rol, setRol] = useState("admin");
  const [hata, setHata] = useState("");
  const [basari, setBasari] = useState("");

  const [yKullanici, setYKullanici] = useState("");
  const [yTur, setYTur] = useState("mute");
  const [ySaat, setYSaat] = useState(24);
  const [ySebep, setYSebep] = useState("");
  const [yHata, setYHata] = useState("");
  const [yBasari, setYBasari] = useState("");

  async function yetkilileriGetir() {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, role")
      .in("role", ["admin", "artist"])
      .order("role")
      .order("username");
    setYetkililer(data || []);
  }

  async function yaptirimlariGetir() {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, restriction, restricted_until, restriction_reason")
      .not("restricted_until", "is", null)
      .gt("restricted_until", new Date().toISOString())
      .order("restricted_until", { ascending: false });
    setYaptirimlar((data as Yaptirim[]) || []);
  }

  useEffect(() => {
    async function baslat() {
      const { data: k } = await supabase.auth.getUser();
      if (k.user) {
        setBenimId(k.user.id);
        const { data: p } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", k.user.id)
          .single();
        const yetkili = p?.role === "admin";
        setAdmin(yetkili);
        if (yetkili) {
          await yetkilileriGetir();
          await yaptirimlariGetir();
        }
      }
      setYukleniyor(false);
    }
    baslat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function rolAta(hedef: string, yeniRol: string) {
    setHata("");
    setBasari("");
    const { data, error } = await supabase.rpc("admin_rol_ata", {
      hedef: hedef.trim(),
      yeni_rol: yeniRol,
    });
    if (error) {
      setHata(error.message);
      return;
    }
    setBasari(`@${data as string} artık: ${ROL_ETIKET[yeniRol]}`);
    setKullanici("");
    await yetkilileriGetir();
  }

  async function yaptirimUygula(e: React.FormEvent) {
    e.preventDefault();
    setYHata("");
    setYBasari("");
    if (!yKullanici.trim()) return;
    const { data, error } = await supabase.rpc("admin_yaptirim", {
      hedef: yKullanici.trim(),
      tur: yTur,
      saat: ySaat,
      sebep: ySebep,
    });
    if (error) {
      setYHata(error.message);
      return;
    }
    setYBasari(
      `@${data as string} ${yTur === "ban" ? "banlandı" : "susturuldu"}.`
    );
    setYKullanici("");
    setYSebep("");
    await yaptirimlariGetir();
  }

  async function yaptirimKaldir(hedef: string) {
    setYHata("");
    setYBasari("");
    const { error } = await supabase.rpc("admin_yaptirim_kaldir", { hedef });
    if (error) {
      setYHata(error.message);
      return;
    }
    setYBasari(`@${hedef} için yaptırım kaldırıldı.`);
    await yaptirimlariGetir();
  }

  if (yukleniyor) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <div className="h-40 animate-pulse rounded-3xl border border-line bg-card" />
      </main>
    );
  }

  if (!admin) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <p className="text-4xl">🔒</p>
        <p className="text-muted">Bu sayfa sadece adminler içindir.</p>
        <Link href="/" className="text-brand hover:underline">
          Ana sayfaya dön
        </Link>
      </main>
    );
  }

  const alan =
    "rounded-2xl bg-card2 p-3 text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand";

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <section className="btn-brand rounded-3xl p-6">
        <h2 className="text-2xl font-extrabold">🛡️ Yönetim paneli</h2>
        <p className="mt-1 text-sm opacity-90">Tüm yönetim araçları burada.</p>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {BAGLANTILAR.map((b) => (
          <Link
            key={b.href}
            href={b.href}
            className="rounded-3xl border border-line bg-card p-4 text-center transition hover:-translate-y-0.5 hover:border-brand"
          >
            <p className="text-3xl">{b.ikon}</p>
            <p className="mt-1 text-sm font-semibold">{b.ad}</p>
          </Link>
        ))}
      </div>

      <section className="space-y-3 rounded-3xl border border-line bg-card p-4">
        <h3 className="font-bold">⛔ Sustur / Banla</h3>
        <p className="text-xs text-muted">
          <b>Sustur:</b> kullanıcı okuyabilir ama paylaşım, yorum, tepki,
          anket ve etkinlik oluşturamaz. <b>Banla:</b> aynı kısıtlamalar +
          hesaba giriş de engellenir. Adminlere uygulanamaz.
        </p>
        <form onSubmit={yaptirimUygula} className="space-y-2">
          <input
            value={yKullanici}
            onChange={(e) => setYKullanici(e.target.value)}
            placeholder="Kullanıcı adı"
            className={`${alan} w-full`}
          />
          <div className="flex gap-2">
            <select
              value={yTur}
              onChange={(e) => setYTur(e.target.value)}
              className={`${alan} flex-1`}
            >
              <option value="mute">🔇 Sustur</option>
              <option value="ban">⛔ Banla</option>
            </select>
            <select
              value={ySaat}
              onChange={(e) => setYSaat(Number(e.target.value))}
              className={`${alan} flex-1`}
            >
              {SURELER.map((s) => (
                <option key={s.saat} value={s.saat}>
                  {s.etiket}
                </option>
              ))}
            </select>
          </div>
          <input
            value={ySebep}
            onChange={(e) => setYSebep(e.target.value)}
            placeholder="Sebep (kullanıcıya gösterilir)"
            maxLength={150}
            className={`${alan} w-full`}
          />
          <button
            type="submit"
            disabled={!yKullanici.trim()}
            className="btn-brand w-full rounded-xl p-3 font-semibold"
          >
            Uygula
          </button>
        </form>

        {yHata && <p className="text-sm text-yellow-500">{yHata}</p>}
        {yBasari && <p className="text-sm text-green-500">{yBasari}</p>}

        <div className="space-y-2">
          <h4 className="text-sm text-muted">
            Aktif yaptırımlar ({yaptirimlar.length})
          </h4>
          {yaptirimlar.length === 0 && (
            <p className="text-sm text-muted">Şu an kısıtlı hesap yok.</p>
          )}
          {yaptirimlar.map((y) => (
            <div
              key={y.id}
              className="flex items-center gap-3 rounded-2xl bg-card2 px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/profil/${y.username}`}
                  className="block truncate font-semibold hover:text-brand"
                >
                  {y.restriction === "ban" ? "⛔" : "🔇"} @{y.username}
                </Link>
                <p className="truncate text-xs text-muted">
                  {new Date(y.restricted_until).getTime() >
                  Date.now() + 50 * 365 * 86400000
                    ? "Süresiz"
                    : `${new Date(y.restricted_until).toLocaleString("tr-TR")} tarihine kadar`}
                  {y.restriction_reason ? ` · ${y.restriction_reason}` : ""}
                </p>
              </div>
              <button
                onClick={() => yaptirimKaldir(y.username)}
                className="shrink-0 text-xs font-semibold text-red-400 hover:text-red-300"
              >
                Kaldır
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border border-line bg-card p-4">
        <h3 className="font-bold">Rol yönetimi</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (kullanici.trim()) rolAta(kullanici, rol);
          }}
          className="flex flex-wrap gap-2"
        >
          <input
            value={kullanici}
            onChange={(e) => setKullanici(e.target.value)}
            placeholder="Kullanıcı adı"
            className={`${alan} min-w-0 flex-1`}
          />
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            className={alan}
          >
            <option value="admin">Admin</option>
            <option value="artist">Sanatçı</option>
            <option value="fan">Hayran (yetkiyi al)</option>
          </select>
          <button
            type="submit"
            disabled={!kullanici.trim()}
            className="btn-brand rounded-xl px-5 py-2 text-sm font-semibold"
          >
            Uygula
          </button>
        </form>

        {hata && <p className="text-sm text-yellow-500">{hata}</p>}
        {basari && <p className="text-sm text-green-500">{basari}</p>}

        <div className="space-y-2">
          {yetkililer.map((y) => (
            <div
              key={y.id}
              className="flex items-center gap-3 rounded-2xl bg-card2 px-3 py-2 text-sm"
            >
              <Link
                href={`/profil/${y.username}`}
                className="min-w-0 flex-1 truncate font-semibold hover:text-brand"
              >
                @{y.username}
              </Link>
              <span className="rounded-full bg-card px-2.5 py-0.5 text-xs text-brand">
                {ROL_ETIKET[y.role] ?? y.role}
              </span>
              {y.id !== benimId && (
                <button
                  onClick={() => rolAta(y.username, "fan")}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Yetkiyi al
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}