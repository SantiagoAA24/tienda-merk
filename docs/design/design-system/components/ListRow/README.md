Filas de lista dentro de una tarjeta: fila de ranking con barra de progreso (lo más vendido) y fila de factura con su estado.

Clases: ranking `tem-rank-row` con `tem-rank`, `tem-rank-row__body`, `tem-rank-row__line` y `tem-meter`; factura `tem-listrow` con `tem-listrow__title`, `tem-listrow__meta` y un `Chip` a la derecha.

**Qué aporta quien lo usa:** en ranking, la posición, el nombre con cantidad y unidad ("Arroz · 22 lb"), el monto y el ancho de la barra en % (el primero 100%, los demás proporcionales al primero). En factura, "FE-0231 · $18.700", la hora y el estado.

- Máximo 3 filas de ranking en Inicio; la lista completa vive en su propia pantalla.
- Las filas de factura se separan con línea punteada; la última no lleva línea.
- Si la fila es tocable, envuélvela en un `<button>` o `<a>` de al menos 44px de alto.
