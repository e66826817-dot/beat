import { Suspense } from "react";
import GrupIcerik from "./grup-icerik";

export default function GrupSayfasi() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-muted">Yükleniyor...</div>}>
      <GrupIcerik />
    </Suspense>
  );
}