// youtu.be, youtube.com/watch, /shorts, /embed bağlantılarından video kimliğini çıkarır
export function youtubeId(girdi: string): string | null {
  const t = girdi.trim();
  if (!t) return null;
  try {
    const u = new URL(t.startsWith("http") ? t : `https://${t}`);
    const h = u.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if (h === "youtu.be") {
      id = u.pathname.slice(1).split("/")[0];
    } else if (h === "youtube.com" || h === "music.youtube.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else {
        const m = u.pathname.match(/^\/(shorts|embed|live)\/([A-Za-z0-9_-]{11})/);
        if (m) id = m[2];
      }
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}