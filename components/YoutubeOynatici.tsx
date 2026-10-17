"use client";

import { useState } from "react";

export default function YoutubeOynatici({
  videoId,
  baslik,
}: {
  videoId: string;
  baslik: string;
}) {
  const [acik, setAcik] = useState(false);

  if (!acik) {
    return (
      <button
        type="button"
        onClick={() => setAcik(true)}
        className="relative block w-full overflow-hidden rounded-2xl"
        aria-label={`${baslik} şarkısını çal`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
          alt={baslik}
          className="aspect-video w-full object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/30">
          <span className="btn-brand flex h-14 w-14 items-center justify-center rounded-full text-2xl">
            ▶
          </span>
        </span>
      </button>
    );
  }

  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
      title={baslik}
      className="aspect-video w-full rounded-2xl"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  );
}