Campo de texto con etiqueta, ayuda y error, y control segmentado para elegir el tipo de precio de un producto (Precio fijo / Por peso).

Clases: `tem-field` con `tem-field__label`, `tem-input`, `tem-field__hint`, `tem-field--error` y `tem-field__error`; `tem-segmented` con dos `<button aria-pressed>`.

**Qué aporta quien lo usa:** un `<label for>` real enlazado al `<input id>`, `inputmode` adecuado (`numeric` para precios, `decimal` para pesos), y el texto de ayuda o de error.

- La etiqueta va siempre visible encima; el placeholder no la reemplaza.
- El error se dice con ícono y palabra, además del borde `danger`, y explica cómo corregir ("Escribe el precio sin puntos ni comas").
- Los precios se escriben sin separadores y se muestran con punto de miles al guardar.
- El control segmentado tiene exactamente dos opciones; la elegida lleva `aria-pressed="true"` y fondo `green-700`.
- Inputs de 52px de alto; con el teclado abierto, el botón principal sigue visible.
