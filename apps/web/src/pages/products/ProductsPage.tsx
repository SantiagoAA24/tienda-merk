import { liveQuery } from "dexie";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { AppShell, Chip, Input, Segmented } from "@/components";
import {
  IconChevron,
  IconPlus,
  IconProducts,
  IconSearch,
} from "@/components/icons";
import { listLocalProducts } from "@/db/products";
import type { LocalProduct } from "@/db/schema";
import { formatProductPrice } from "@/lib/format";

type Filter = "all" | "weight" | "fixed";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "weight", label: "Por peso" },
  { value: "fixed", label: "Precio fijo" },
];

export function ProductsPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [products, setProducts] = useState<LocalProduct[] | null>(null);

  useEffect(() => {
    const observable = liveQuery(() =>
      listLocalProducts({ priceType: filter, query }),
    );
    const subscription = observable.subscribe({
      next: (rows) => setProducts(rows),
      error: () => setProducts([]),
    });
    return () => subscription.unsubscribe();
  }, [filter, query]);

  const emptyCatalog =
    products !== null && products.length === 0 && !query && filter === "all";
  const emptyFilter =
    products !== null &&
    products.length === 0 &&
    Boolean(query || filter !== "all");

  return (
    <AppShell active="productos">
      <main className="tem-products">
        <header className="tem-products__header">
          <h1 className="tem-products__title">Productos</h1>
        </header>

        {emptyCatalog ? (
          <EmptyState />
        ) : (
          <>
            <div className="tem-products__search">
              <IconSearch className="tem-products__search-icon" />
              <Input
                aria-label="Buscar producto"
                placeholder="Buscar producto"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <Segmented
              className="tem-products__filters"
              label="Filtrar por tipo de precio"
              labelId="product-filter"
              options={FILTERS}
              value={filter}
              onChange={setFilter}
              size="compact"
            />

            {emptyFilter ? (
              <p className="tem-products__empty-filter" role="status">
                No hay productos con ese filtro.
              </p>
            ) : (
              <section
                className="tem-products__list"
                aria-label="Lista de productos"
              >
                {(products ?? []).map((product) => (
                  <Link
                    key={product.id}
                    to={`/productos/${product.id}/editar`}
                    className="tem-product-row"
                  >
                    <span className="tem-product-row__main">
                      <span className="tem-product-row__name">
                        {product.name}
                      </span>
                      <Chip
                        variant={
                          product.price_type === "weight" ? "weight" : "fixed"
                        }
                      >
                        {product.price_type === "weight"
                          ? "Por peso"
                          : "Precio fijo"}
                      </Chip>
                    </span>
                    <span className="tem-product-row__price">
                      {formatProductPrice(
                        product.price,
                        product.price_type,
                        product.unit,
                      )}
                    </span>
                    <IconChevron className="tem-product-row__chevron" />
                  </Link>
                ))}
              </section>
            )}

            <div className="tem-products__cta">
              <Link
                to="/productos/nuevo"
                className="tem-btn tem-btn--primary tem-products__add-link"
              >
                <IconPlus />
                Agregar producto
              </Link>
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="tem-products-empty">
      <div className="tem-products-empty__icon" aria-hidden>
        <IconProducts size={44} />
      </div>
      <h2 className="tem-products-empty__title">Agrega tu primer producto</h2>
      <p className="tem-products-empty__text">
        Pon el precio fijo o por peso y ya puedes empezar a vender.
      </p>
      <Link
        to="/productos/nuevo"
        className="tem-btn tem-btn--primary tem-products__add-link"
      >
        <IconPlus />
        Agregar producto
      </Link>
    </div>
  );
}
