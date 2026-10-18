import Link from "next/link";
import { BELGELER } from "../lib/belgeler";

export default function AltBilgi() {
  return (
    <footer className="mx-auto max-w-2xl px-4 pb-6 pt-2 text-center text-xs text-muted">
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {BELGELER.map((b) => (
          <Link
            key={b.id}
            href={`/belge/${b.id}`}
            className="hover:text-ink hover:underline"
          >
            {b.baslik}
          </Link>
        ))}
      </div>
      <p className="mt-2">
        Beat bağımsız bir hayran topluluğudur; anılan sanatçı ve şirketlerle
        resmi bağlantısı yoktur.
      </p>
    </footer>
  );
}