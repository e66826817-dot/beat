import { Belge } from "../lib/belgeler";

export default function BelgeMetni({ belge }: { belge: Belge }) {
  return (
    <article className="space-y-4 text-sm leading-relaxed">
      {belge.bolumler.map((b, i) => (
        <section key={i} className="space-y-1.5">
          <h3 className="font-bold">
            {i + 1}. {b.baslik}
          </h3>
          {b.paragraflar.map((p, k) => (
            <p key={k} className="text-muted">
              {p}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}