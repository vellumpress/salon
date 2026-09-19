import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SHOPS } from "@/lib/bookstores";
import { ShopCard, StoreMap } from "@/components/store-map";

export const Route = createFileRoute("/stores")({
  component: StoresPage,
});

function StoresPage() {
  const [selected, setSelected] = useState<string>(SHOPS[0]?.id ?? "strand");

  useEffect(() => {
    document.getElementById(`shop-${selected}`)?.scrollIntoView({
      block: "center",
      behavior: "auto",
    });
  }, [selected]);

  return (
    <div className="frame-screen bg-paper text-ink">
      <header className="flex shrink-0 items-stretch border-b border-ink">
        <Link
          to="/"
          className="type-chrome inline-flex h-12 shrink-0 items-center justify-center bg-ink px-4 text-paper"
        >
          Home
        </Link>
        <h1 className="type-mark flex min-w-0 flex-1 items-center px-4">
          Book stores
        </h1>
      </header>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="map-pane">
          <StoreMap selected={selected} onSelect={setSelected} />
        </div>
        <aside className="min-h-0 flex-1 overflow-y-auto border-t border-ink md:h-full md:w-80 md:flex-none md:border-t-0 md:border-l">
          <p className="border-b border-ink px-4 py-3 type-kicker text-muted">
            New York shops to browse in person
          </p>
          {SHOPS.map((shop) => (
            <ShopCard
              key={shop.id}
              shop={shop}
              active={shop.id === selected}
              onClick={() => setSelected(shop.id)}
            />
          ))}
        </aside>
      </div>
    </div>
  );
}
