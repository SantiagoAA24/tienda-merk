/** TODO(contador): confirmar las categorías de IVA que aplican a la tienda. */
export type Iva = "excluido" | "exento" | "5" | "19";

export type PriceType = "fixed" | "weight";

export type Unit = "und" | "g" | "kg" | "lb";

export type Product = {
  id: string;
  name: string;
  price_type: PriceType;
  price: string;
  unit: Unit;
  iva: Iva;
  cost?: string | null;
  active: boolean;
};

export type ProductCreate = {
  name: string;
  price_type: PriceType;
  price: string;
  unit?: Unit;
  iva: Iva;
  cost?: string | null;
};

export type ProductUpdate = {
  name?: string;
  price_type?: PriceType;
  price?: string;
  unit?: Unit;
  iva?: Iva;
  cost?: string | null;
  active?: boolean;
};

export const WEIGHT_UNITS: readonly Unit[] = ["g", "kg", "lb"];
