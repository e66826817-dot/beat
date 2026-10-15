import { Suspense } from "react";
import EtiketIcerik from "./etiket-icerik";

export default function EtiketSayfasi() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-muted">Yükleniyor...</div>}>
      <EtiketIcerik />
    </Suspense>
  );
}