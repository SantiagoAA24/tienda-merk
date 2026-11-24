import { useState } from "react";

import {
  BottomNav,
  Button,
  Card,
  CardHead,
  CardTitle,
  Chip,
  DeltaChip,
  Field,
  Header,
  IconButton,
  ListRow,
  RankRow,
  Segmented,
  Stats,
  StatusChip,
  WeekChart,
  type BottomNavTab,
} from "@/components";
import { IconMore, IconPlus } from "@/components/icons";

export function ComponentesDevPage() {
  const [priceType, setPriceType] = useState<"fixed" | "weight">("weight");
  const [nav, setNav] = useState<BottomNavTab>("inicio");
  const [selectedDay, setSelectedDay] = useState(5);

  return (
    <div className="tem-app" style={{ maxWidth: 390, margin: "0 auto" }}>
      <main style={{ paddingBottom: 96 }}>
        <div className="tem-on-green">
          <Header greeting="Buenas noches" title="Sábado, 21 de noviembre" />
        </div>

        <Card hero overlap>
          <Stats
            eyebrow="Ventas de hoy"
            total="$184.500"
            delta={<DeltaChip>8% vs. ayer</DeltaChip>}
            items={[
              { value: "23", label: "ventas" },
              { value: "$8.022", label: "por venta" },
              { value: "21 de 23", label: "facturas en la DIAN" },
            ]}
          />
        </Card>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
            padding: "var(--space-4)",
          }}
        >
          <section aria-labelledby="dev-botones">
            <h2 id="dev-botones" className="tem-card__title">
              Botones
            </h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
                marginTop: "var(--space-3)",
              }}
            >
              <Button variant="primary">
                <IconPlus />
                Nueva venta
              </Button>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Button variant="secondary">Agregar producto</Button>
                <Button variant="dark">Cobrar</Button>
              </div>
              <div>
                <Button variant="text">Ver todos</Button>
              </div>
              <div
                style={{
                  background: "var(--green-700)",
                  borderRadius: "var(--radius-xl)",
                  padding: 12,
                  display: "inline-flex",
                }}
              >
                <IconButton aria-label="Más opciones">
                  <IconMore />
                </IconButton>
              </div>
            </div>
          </section>

          <Card>
            <CardHead>
              <CardTitle>Tarjeta base</CardTitle>
              <span className="tem-muted" style={{ fontSize: 13, fontWeight: 700 }}>
                $990.500
              </span>
            </CardHead>
            <p style={{ margin: "8px 0 0" }}>
              Contenedor para listas, gráficas y formularios.
            </p>
          </Card>

          <section aria-labelledby="dev-chips">
            <h2 id="dev-chips" className="tem-card__title">
              Chips
            </h2>
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: "var(--space-3)",
              }}
            >
              <StatusChip status="accepted" />
              <StatusChip status="pending" />
              <StatusChip status="rejected" />
              <DeltaChip>8% vs. ayer</DeltaChip>
              <Chip variant="weight">Por peso</Chip>
              <Chip variant="fixed">Precio fijo</Chip>
            </div>
          </section>

          <Card>
            <CardHead>
              <CardTitle>Esta semana</CardTitle>
              <span className="tem-muted" style={{ fontSize: 13, fontWeight: 700 }}>
                $990.500
              </span>
            </CardHead>
            <WeekChart
              selectedIndex={selectedDay}
              onSelectDay={setSelectedDay}
              days={[
                { label: "L", height: 65, amountLabel: "$120.000" },
                { label: "M", height: 77, amountLabel: "$145.000" },
                { label: "M", height: 60, amountLabel: "$110.000" },
                { label: "J", height: 71, amountLabel: "$130.000" },
                { label: "V", height: 96, amountLabel: "$180.000" },
                {
                  label: "S",
                  height: 84,
                  kind: "today",
                  amountLabel: "$184.500",
                },
                { label: "D", kind: "empty" },
              ]}
            />
          </Card>

          <Card style={{ paddingBottom: 8 }}>
            <CardTitle style={{ marginBottom: 6 }}>Lo más vendido hoy</CardTitle>
            <RankRow
              rank={1}
              name="Arroz · 22 lb"
              amount="$68.200"
              progress={100}
            />
            <RankRow
              rank={2}
              name="Papa pastusa · 14 kg"
              amount="$44.800"
              progress={66}
            />
          </Card>

          <Card style={{ paddingTop: 8, paddingBottom: 8 }}>
            <ListRow
              title="FE-0231 · $18.700"
              meta="7:42 p. m."
              status="accepted"
            />
            <ListRow
              title="FE-0229 · $42.350"
              meta="7:20 p. m."
              status="pending"
            />
            <ListRow
              title="FE-0228 · $9.100"
              meta="6:55 p. m."
              status="rejected"
            />
          </Card>

          <Card>
            <CardTitle style={{ marginBottom: 12 }}>Campos</CardTitle>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <Field
                label="Nombre del producto"
                inputProps={{ defaultValue: "Papa pastusa" }}
              />
              <Segmented
                label="Tipo de precio"
                labelId="dev-tipo-precio"
                value={priceType}
                onChange={setPriceType}
                options={[
                  { value: "fixed", label: "Precio fijo" },
                  { value: "weight", label: "Por peso" },
                ]}
              />
              <Field
                label="Precio por kg"
                hint="Se muestra como $3.200 / kg"
                inputProps={{
                  inputMode: "numeric",
                  defaultValue: "3200",
                }}
              />
              <Field
                label="Precio por lb"
                error="Escribe el precio sin puntos ni comas"
                inputProps={{
                  inputMode: "numeric",
                  defaultValue: "3.1",
                }}
              />
            </div>
          </Card>
        </div>
      </main>

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0 }}>
        <div style={{ maxWidth: 390, margin: "0 auto" }}>
          <BottomNav active={nav} onChange={setNav} />
        </div>
      </div>
    </div>
  );
}
