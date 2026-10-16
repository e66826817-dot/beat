import Link from "next/link";

export default function OyunlarSayfasi() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <div>
        <h2 className="text-2xl font-extrabold">🎮 Oyunlar</h2>
        <p className="text-sm text-muted">
          Diğer hayranlarla oyna. Maç ya da görev gerekmez, sadece keyif için.
        </p>
      </div>

      <Link
        href="/oyunlar/satranc"
        className="btn-brand block rounded-3xl p-6 transition hover:-translate-y-0.5"
      >
        <p className="text-4xl">♟️</p>
        <h3 className="mt-2 text-xl font-extrabold">Satranç</h3>
        <p className="text-sm opacity-90">
          Online, 2 kişilik. Oyun aç, linki arkadaşına gönder ya da bekleyen bir
          oyuna katıl.
        </p>
      </Link>

      <div className="rounded-3xl border border-dashed border-line bg-card p-6 opacity-80">
        <p className="text-4xl">🀄</p>
        <h3 className="mt-2 text-xl font-extrabold">Okey</h3>
        <p className="text-sm text-muted">Yakında geliyor.</p>
      </div>
    </main>
  );
}