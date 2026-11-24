Superficies blancas con borde de 2px: la tarjeta base para listas y gráficas, y la tarjeta principal (hero) que se monta sobre el encabezado.

Clases: `tem-card`, `tem-card--hero` (con `shadow-card`), `tem-overlap` (margen negativo para montarla sobre el encabezado), `tem-card__head` y `tem-card__title`.

**Qué aporta quien lo usa:** el contenido y un título de una línea (estilo `title`).

- La tarjeta hero va una sola vez por pantalla, justo debajo de `AppHeader`, y lleva la cifra más importante.
- Entre tarjetas deja `space-4` (16px) de margen vertical y lateral.
- No anides tarjetas dentro de tarjetas ni agregues acentos de color en un solo borde; para destacar usa un chip.
