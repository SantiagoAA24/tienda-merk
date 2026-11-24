import { liveQuery } from "dexie";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BackHeader, Button, Chip, Input } from "@/components";
import { IconSearch } from "@/components/icons";
import { addFixedLine, clearCart, getCart } from "@/db/cart";
import { listLocalProducts } from "@/db/products";
import type { LocalProduct } from "@/db/schema";
import {
  formatMoney,
  formatProductPrice,
  formatQuantity,
} from "@/lib/format";
import { saleTotals } from "@/lib/pricing";
import type { CartDraft } from "@/sales/types";

const FAVORITE_LIMIT = 6;

export function SalePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<LocalProduct[] | null>(null);
  const [cart, setCart] = useState<CartDraft | null>(null);

  useEffect(() => {
    const productsQuery = liveQuery(() =>
      listLocalProducts({ query, activeOnly: true }),
    );
    const cartQuery = liveQuery(() => getCart());
    const productsSub = productsQuery.subscribe({
      next: (rows) => setProducts(rows),
      error: () => setProducts([]),
    });
    const cartSub = cartQuery.subscribe({
      next: (value) => setCart(value),
      error: () => setCart(null),
    });
    return () => {
      productsSub.unsubscribe();
      cartSub.unsubscribe();
    };
  }, [query]);

  const favorites = useMemo(() => {
    if (!products) return [];
    if (query.trim()) return products.slice(0, FAVORITE_LIMIT);
    return products.slice(0, FAVORITE_LIMIT);
  }, [products, query]);

  const totals = saleTotals(cart?.lines ?? []);
  const lineCount = cart?.lines.length ?? 0;

  async function handleProductPick(product: LocalProduct) {
    if (product.price_type === "weight") {
      navigate(`/venta/peso/${product.id}`);
      return;
    }
    await addFixedLine({
      productId: product.id,
      name: product.name,
      unitPricePesos: Number(product.price),
      iva: product.iva,
    });
  }

  async function handleClear() {
    await clearCart();
  }

  return (
    <div className="tem-app tem-sale">
      <BackHeader
        title="Nueva venta"
        to="/"
        trailing={
          <button
            type="button"
            className="tem-sale__link-action"
            onClick={() => void handleClear()}
            disabled={lineCount === 0}
          >
            Vaciar
          </button>
        }
      />

      <div className="tem-sale__search">
        <IconSearch className="tem-sale__search-icon" />
        <Input
          aria-label="Buscar producto"
          placeholder="Buscar producto"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <section className="tem-sale__favorites" aria-labelledby="sale-favorites">
        <div className="tem-sale__section-head">
          <h2 id="sale-favorites" className="tem-sale__section-title">
            Favoritos
          </h2>
        </div>
        {products !== null && favorites.length === 0 ? (
          <p className="tem-sale__empty" role="status">
            {query
              ? "No hay productos con esa búsqueda."
              : "No hay productos activos. Agrégalos en Productos."}
          </p>
        ) : (
          <div className="tem-sale__grid">
            {favorites.map((product) => (
              <button
                key={product.id}
                type="button"
                className="tem-sale__tile"
                onClick={() => void handleProductPick(product)}
              >
                <span className="tem-sale__tile-name">{product.name}</span>
                <Chip
                  variant={product.price_type === "weight" ? "weight" : "fixed"}
                >
                  {product.price_type === "weight" ? "Por peso" : "Precio fijo"}
                </Chip>
                <span className="tem-sale__tile-price">
                  {formatProductPrice(
                    product.price,
                    product.price_type,
                    product.unit,
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section
        className="tem-sale__current"
        aria-labelledby="sale-current"
      >
        <div className="tem-sale__section-head">
          <h2 id="sale-current" className="tem-sale__section-title">
            Venta actual
          </h2>
          <span className="tem-sale__count" aria-live="polite">
            {lineCount}
          </span>
        </div>
        {lineCount === 0 ? (
          <p className="tem-sale__empty" role="status">
            Agrega productos para empezar.
          </p>
        ) : (
          <ul className="tem-sale__lines">
            {cart?.lines.map((line) => (
              <li key={line.id} className="tem-sale__line">
                <div>
                  <div className="tem-sale__line-name">{line.name}</div>
                  <div className="tem-sale__line-meta">
                    {formatQuantity(line.quantityMillis, line.unit, {
                      asMillis: true,
                    })}{" "}
                    × {formatMoney(line.unitPricePesos)}
                  </div>
                </div>
                <div className="tem-sale__line-total">
                  {formatMoney(line.lineTotal)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="tem-sale__checkout-bar">
        <div>
          <div className="tem-sale__checkout-label">Total</div>
          <div className="tem-sale__checkout-total">
            {formatMoney(totals.total)}
          </div>
        </div>
        <Button
          variant="dark"
          className="tem-sale__charge"
          disabled={lineCount === 0}
          onClick={() => navigate("/venta/cobrar")}
        >
          Cobrar
        </Button>
      </div>
    </div>
  );
}
