import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Alert, BackHeader, Button, Field, Input, Segmented } from "@/components";
import { getCart, updateCheckoutDraft } from "@/db/cart";
import {
  DOC_TYPE_LABELS,
  type CustomerDocType,
  type SaleCustomer,
} from "@/sales/types";

const DOC_OPTIONS: { value: CustomerDocType; label: string }[] = [
  { value: "cc", label: DOC_TYPE_LABELS.cc },
  { value: "nit", label: DOC_TYPE_LABELS.nit },
  { value: "other", label: DOC_TYPE_LABELS.other },
];

export function CustomerPage() {
  const navigate = useNavigate();
  const [docType, setDocType] = useState<CustomerDocType>("cc");
  const [document, setDocument] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getCart().then((cart) => {
      if (cart.customer) {
        setDocType(cart.customer.docType);
        setDocument(cart.customer.document);
        setName(cart.customer.name);
        setEmail(cart.customer.email);
      }
    });
  }, []);

  async function handleSave() {
    setError(null);
    if (!document.trim() || !name.trim()) {
      setError("Completa el documento y el nombre.");
      return;
    }
    const customer: SaleCustomer = {
      docType,
      document: document.trim(),
      name: name.trim(),
      email: email.trim(),
    };
    await updateCheckoutDraft({ customerMode: "named", customer });
    navigate("/venta/cobrar");
  }

  return (
    <div className="tem-app tem-sale">
      <BackHeader title="Datos del cliente" to="/venta/cobrar" />

      <section className="tem-sale-card">
        <Segmented
          label="Tipo de documento"
          options={DOC_OPTIONS}
          value={docType}
          onChange={setDocType}
          size="compact"
        />

        <Field label="Número de documento" id="customer-doc">
          <Input
            id="customer-doc"
            value={document}
            onChange={(event) => setDocument(event.target.value)}
            inputMode="numeric"
          />
        </Field>
        <Field label="Nombre o razón social" id="customer-name">
          <Input
            id="customer-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field
          label="Correo para enviar la factura"
          id="customer-email"
          hint="También puedes compartirla por WhatsApp."
        >
          <Input
            id="customer-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
      </section>

      <div className="tem-checkout__banner" role="note">
        Para ventas normales usa &quot;Consumidor final&quot;. Los datos solo se
        piden si el cliente los exige.
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <div className="tem-sale__footer-cta">
        <Button variant="primary" className="tem-sale__add" onClick={() => void handleSave()}>
          Usar estos datos
        </Button>
      </div>
    </div>
  );
}
