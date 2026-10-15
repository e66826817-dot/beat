import { Suspense } from "react";
import ProfilIcerik from "./profil-icerik";

export default function ProfilSayfasi() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-muted">Yükleniyor...</div>}>
      <ProfilIcerik />
    </Suspense>
  );
}