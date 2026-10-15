import { Suspense } from "react";
import GonderiIcerik from "./gonderi-icerik";

export default function GonderiSayfasi() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-muted">Yükleniyor...</div>}>
      <GonderiIcerik />
    </Suspense>
  );
}