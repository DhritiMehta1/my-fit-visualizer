import { Link } from "@tanstack/react-router";

import logoAsset from "@/assets/atelier-logo.png.asset.json";

export function SiteLogo({ className = "h-9 sm:h-11" }: { className?: string }) {
  return (
    <Link to="/" aria-label="Atelier Clotheswear home" className="inline-flex shrink-0">
      <img
        src={logoAsset.url}
        alt="Atelier Clotheswear"
        className={`${className} w-auto object-contain`}
      />
    </Link>
  );
}