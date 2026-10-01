import React, { useState } from "react";

interface LugaresSilhouettesBannerProps {
  className?: string;
  color?: string;
}

export function LugaresSilhouettesBanner({
  className = "w-full h-28 sm:h-36 md:h-44",
  color = "#232e33",
}: LugaresSilhouettesBannerProps) {
  const [imgSrc, setImgSrc] = useState("/images/caldo_lugares_carroza_solid.png");

  return (
    <div
      className={`relative w-full overflow-hidden select-none flex items-end justify-center ${className}`}
    >
      {/* Ground Line neutral */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent pointer-events-none z-30" />

      {/* Lugares / Carroza silhouette (sin aura) */}
      <div className="relative z-10 flex items-end justify-center h-full max-w-4xl mx-auto px-4 pb-0">
        <img
          src={imgSrc}
          alt="Silueta de Lugares y Carroza de Caldo de Dragón"
          className="w-auto h-full max-h-44 object-contain object-bottom select-none pointer-events-none transition-transform duration-300 group-hover:scale-[1.01] block"
          onError={() => setImgSrc("/images/caldo_lugares_carroza_solid.png")}
        />
      </div>
    </div>
  );
}
