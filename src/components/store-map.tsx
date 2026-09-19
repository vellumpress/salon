import { SHOPS, mapsUrl, type Shop } from "@/lib/bookstores";

type Props = {
  selected: string | null;
  onSelect: (id: string) => void;
};

const LAT0 = 40.66;
const LAT1 = 40.82;
const LNG0 = -74.05;
const LNG1 = -73.90;

function pinStyle(shop: Shop) {
  const x = ((shop.lng - LNG0) / (LNG1 - LNG0)) * 100;
  const y = ((LAT1 - shop.lat) / (LAT1 - LAT0)) * 100;
  return {
    left: `${Math.min(96, Math.max(4, x))}%`,
    top: `${Math.min(96, Math.max(4, y))}%`,
  };
}

export function StoreMap({ selected, onSelect }: Props) {
  return (
    <div className="store-map relative overflow-hidden bg-paper">
      <span className="pointer-events-none absolute inset-y-0 left-[18%] w-px bg-ink/20" />
      <span className="pointer-events-none absolute inset-y-0 left-[42%] w-px bg-ink/20" />
      <span className="pointer-events-none absolute inset-y-0 left-[68%] w-px bg-ink/20" />
      <span className="pointer-events-none absolute inset-x-0 top-[28%] h-px bg-ink/20" />
      <span className="pointer-events-none absolute inset-x-0 top-[58%] h-px bg-ink/20" />
      <span className="pointer-events-none absolute inset-y-0 left-0 w-[14%] bg-blue" />
      {SHOPS.map((shop) => (
        <button
          key={shop.id}
          type="button"
          aria-label={shop.name}
          aria-pressed={shop.id === selected}
          title={shop.name}
          onClick={() => onSelect(shop.id)}
          className={shop.id === selected ? "shop-pin is-live" : "shop-pin"}
          style={pinStyle(shop)}
        />
      ))}
    </div>
  );
}

export function ShopCard({
  shop,
  active,
  onClick,
}: {
  shop: Shop;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      id={`shop-${shop.id}`}
      className={`border-b border-ink ${active ? "border-l-4 border-l-red bg-paper-deep" : "bg-paper"}`}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full flex-col items-start px-4 pt-4 pb-2 text-left"
      >
        <span className="type-lede">{shop.name}</span>
        <span className="mt-1 type-kicker text-muted">{shop.neighborhood}</span>
        <span className="mt-0.5 font-serif text-sm">{shop.address}</span>
      </button>
      <a
        href={mapsUrl(shop)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex px-4 pb-4 type-kicker underline decoration-ink/30 underline-offset-4"
      >
        Directions
      </a>
    </div>
  );
}
