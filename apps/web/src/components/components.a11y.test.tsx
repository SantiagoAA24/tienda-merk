import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { Alert } from "./Alert";
import { AuthCover } from "./AuthCover";
import { BackHeader } from "./BackHeader";
import { BottomNav } from "./BottomNav";
import { Checkbox } from "./Checkbox";
import { PasswordField } from "./PasswordField";
import { Button, IconButton } from "./Button";
import { StatusChip } from "./Chip";
import { Field } from "./Field";
import { Header } from "./Header";
import { ListRow } from "./ListRow";
import { RankRow } from "./RankRow";
import { Segmented } from "./Segmented";
import { WeekChart } from "./WeekChart";
import { IconMore, IconPlus } from "./icons";

describe("design system accessibility", () => {
  it("Button exposes role, name and receives focus", async () => {
    const user = userEvent.setup();
    render(
      <Button variant="primary">
        <IconPlus />
        Nueva venta
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Nueva venta" });
    expect(button).toBeInTheDocument();
    await user.tab();
    expect(button).toHaveFocus();
  });

  it("IconButton requires an accessible name and is focusable", async () => {
    const user = userEvent.setup();
    render(
      <IconButton aria-label="Más opciones">
        <IconMore />
      </IconButton>,
    );

    const button = screen.getByRole("button", { name: "Más opciones" });
    await user.tab();
    expect(button).toHaveFocus();
  });

  it("Header renders title and named menu control", () => {
    render(<Header greeting="Buenos días" title="Lunes, 23 de noviembre" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Lunes, 23 de noviembre" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Más opciones" }),
    ).toBeInTheDocument();
  });

  it("StatusChip shows text for each invoice status", () => {
    const { rerender } = render(<StatusChip status="accepted" />);
    expect(screen.getByText("Aceptada")).toBeInTheDocument();

    rerender(<StatusChip status="pending" />);
    expect(screen.getByText("Por reenviar")).toBeInTheDocument();

    rerender(<StatusChip status="rejected" />);
    expect(screen.getByText("Rechazada")).toBeInTheDocument();
  });

  it("Field links label to input and announces errors", async () => {
    const user = userEvent.setup();
    render(
      <Field
        label="Precio por lb"
        error="Escribe el precio sin puntos ni comas"
        inputProps={{ defaultValue: "3.1" }}
      />,
    );

    const input = screen.getByRole("textbox", { name: "Precio por lb" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "Escribe el precio sin puntos ni comas",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Escribe el precio sin puntos ni comas",
    );

    await user.tab();
    expect(input).toHaveFocus();
  });

  it("Segmented uses pressed state and is keyboard focusable", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Segmented
        label="Tipo de precio"
        value="fixed"
        onChange={onChange}
        options={[
          { value: "fixed", label: "Precio fijo" },
          { value: "weight", label: "Por peso" },
        ]}
      />,
    );

    expect(screen.getByRole("group", { name: "Tipo de precio" })).toBeInTheDocument();
    const fixed = screen.getByRole("button", { name: "Precio fijo" });
    const weight = screen.getByRole("button", { name: "Por peso" });
    expect(fixed).toHaveAttribute("aria-pressed", "true");
    expect(weight).toHaveAttribute("aria-pressed", "false");

    await user.tab();
    expect(fixed).toHaveFocus();
    await user.click(weight);
    expect(onChange).toHaveBeenCalledWith("weight");
  });

  it("BottomNav exposes navigation name and current page", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BottomNav active="inicio" onChange={onChange} />);

    expect(
      screen.getByRole("navigation", { name: "Navegación principal" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inicio" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "Inicio" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Ventas" }));
    expect(onChange).toHaveBeenCalledWith("ventas");
  });

  it("RankRow exposes a named meter", () => {
    render(
      <RankRow
        rank={1}
        name="Arroz · 22 lb"
        amount="$68.200"
        progress={100}
      />,
    );

    const meter = screen.getByRole("meter", {
      name: "Arroz · 22 lb: $68.200",
    });
    expect(meter).toHaveAttribute("aria-valuenow", "100");
  });

  it("ListRow shows invoice title and status text", () => {
    render(
      <ListRow title="FE-0231 · $18.700" meta="7:42 p. m." status="accepted" />,
    );

    expect(screen.getByText("FE-0231 · $18.700")).toBeInTheDocument();
    expect(screen.getByText("Aceptada")).toBeInTheDocument();
  });

  it("WeekChart has an accessible name and focusable day controls", async () => {
    const user = userEvent.setup();
    const onSelectDay = vi.fn();
    render(
      <WeekChart
        onSelectDay={onSelectDay}
        days={[
          { label: "L", height: 40, amountLabel: "$10.000" },
          { label: "M", height: 50, kind: "today", amountLabel: "$12.000" },
        ]}
      />,
    );

    expect(
      screen.getByRole("group", { name: /Ventas de la semana/ }),
    ).toBeInTheDocument();

    const today = screen.getByRole("button", { name: "Hoy: $12.000" });
    await user.tab();
    expect(screen.getByRole("button", { name: "L: $10.000" })).toHaveFocus();
    await user.click(today);
    expect(onSelectDay).toHaveBeenCalledWith(1);
  });

  it("Alert announces the error with text", () => {
    render(<Alert>Usuario o contraseña incorrectos.</Alert>);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Usuario o contraseña incorrectos.",
    );
  });

  it("Checkbox is a labelled, focusable checkbox", async () => {
    const user = userEvent.setup();
    render(<Checkbox defaultChecked>Mantener sesión en este celular</Checkbox>);

    const checkbox = screen.getByRole("checkbox", {
      name: "Mantener sesión en este celular",
    });
    expect(checkbox).toBeChecked();
    await user.tab();
    expect(checkbox).toHaveFocus();
    await user.keyboard(" ");
    expect(checkbox).not.toBeChecked();
  });

  it("PasswordField labels the input and the visibility toggle", async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Contraseña" invalid />);

    const input = screen.getByLabelText("Contraseña");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("aria-invalid", "true");
    await user.click(
      screen.getByRole("button", { name: "Mostrar contraseña" }),
    );
    expect(input).toHaveAttribute("type", "text");
  });

  it("BackHeader has a labelled back link and a heading", () => {
    render(
      <MemoryRouter>
        <BackHeader title="Recuperar contraseña" to="/iniciar-sesion" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Volver" })).toHaveAttribute(
      "href",
      "/iniciar-sesion",
    );
    expect(
      screen.getByRole("heading", { name: "Recuperar contraseña" }),
    ).toBeInTheDocument();
  });

  it("AuthCover shows the brand as a heading", () => {
    render(<AuthCover />);

    expect(
      screen.getByRole("heading", { name: "Tienda Express Merk" }),
    ).toBeInTheDocument();
  });
});
