Encabezado verde de pantalla con la marca de texto, un botón de opciones, el saludo y el título.

Clases: `tem-header` (contenedor, sobre `green-700`), `tem-header__row`, `tem-brand` con `tem-brand__mark` y `tem-brand__name`, `tem-iconbtn`, `tem-greeting`, `tem-header__title`.

**Qué aporta quien lo usa:** el título (normalmente la fecha larga) y el saludo según la hora. El contenedor de pantalla debe dar 390px de ancho.

- Deja 64px de padding inferior para que la tarjeta principal se monte encima con `tem-overlap`.
- El botón de ícono lleva `aria-label`. Al estar sobre `green-700`, el anillo de foco usa `tem-on-green` en un ancestro.
- Úsalo solo en Inicio; en pantallas internas usa un encabezado simple de título sobre `surface-page`.
- No pongas más de una línea de saludo ni más de un título.
