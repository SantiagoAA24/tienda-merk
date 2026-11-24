Etiquetas pequeñas en forma de píldora para estados de factura, variación del día y tipo de precio de un producto.

Clases: `tem-chip` más `tem-chip--ok` (Aceptada), `tem-chip--pending` (Por reenviar), `tem-chip--error` (Rechazada), `tem-chip--delta` (variación vs. ayer), `tem-chip--weight` (Por peso), `tem-chip--fixed` (Precio fijo).

**Qué aporta quien lo usa:** el texto del estado y su ícono de 13–14px (✓ para Aceptada, reloj para Por reenviar, flecha para variación).

- El estado siempre se dice con palabra e ícono; el color no basta.
- Aceptada = la DIAN validó la factura. Por reenviar = pendiente o en reintento. Rechazada = el tendero debe corregir y reenviar.
- Por peso (madera) y Precio fijo (lima claro) van en la fila o tarjeta de cada producto.
- Un chip por elemento; no apiles dos estados en la misma fila.
