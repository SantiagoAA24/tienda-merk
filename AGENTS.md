# Tienda Express Merk

PWA de ventas y facturación electrónica DIAN para una tienda de barrio en Colombia.
Lee siempre: docs/PLAN-DESARROLLO.md, docs/design/design-system/README.md y docs/design/design-system/tokens.json.

## Reglas
- Idioma de la interfaz y los mensajes: español de Colombia. Código y commits en inglés.
- Pantallas de referencia: docs/design/pantallas/NN-nombre.html. Reproducir el diseño con componentes React y los tokens, sin colores ni medidas sueltas.
- Dinero en pesos enteros mostrados como $184.500; cantidades con coma (2,5 kg); hora 7:42 p. m.; factura FE-0231.
- Estados de factura siempre con texto e ícono: Aceptada, Por reenviar, Rechazada.
- Una acción principal (botón lima) por pantalla. Áreas táctiles de mínimo 44 px.
- Vender nunca depende del internet: guardar primero en el dispositivo.
- Los datos fiscales (IVA, documento a emitir, numeración) son configurables; no los inventes. Marca con TODO(contador) lo que deba validarse.
- Cada cambio incluye pruebas. No avances de tarea sin que pasen lint, tipos y pruebas.
- Secretos solo en variables de entorno; nunca en el repo.