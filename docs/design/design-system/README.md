Tienda Express Merk es una app móvil (PWA) para una tienda de barrio en Colombia: registrar ventas, llevar el catálogo (precio fijo o por peso) y emitir facturas electrónicas ante la DIAN. El sistema se usa en pantallas de 390px de ancho, con una mano y a veces con poca luz.

## Fundamentos de contenido

- Escribe en español de Colombia, directo y corto. Botones con verbo en infinitivo o sustantivo claro: "Nueva venta", "Cobrar", "Ver todos". Sin jerga contable ni tecnicismos de la DIAN en la superficie.
- Moneda en pesos sin decimales y con punto de miles: `$184.500`, `$8.022`. Pesos por unidad: `$3.200 / kg`; precio fijo: `$600 c/u`.
- Cantidades con coma decimal y unidad abreviada: `18,5 kg`, `22 lb`, `48 und`.
- Fecha larga en el encabezado: "Sábado, 21 de noviembre"; corta: "Sáb 21 nov". Hora: `7:42 p. m.`
- Facturas con prefijo y consecutivo: `FE-0231`.
- Estados de factura con palabra, nunca solo color: **Aceptada** (la DIAN la validó), **Por reenviar** (pendiente o reintentando), **Rechazada** (error que el tendero debe corregir).
- Saludo según la hora ("Buenos días", "Buenas tardes", "Buenas noches"). Sin emojis ni signos de exclamación en datos.

## Fundamentos visuales

- **Color.** El verde profundo `green-900` y el verde del chaleco `green-700` son la marca; el lima `lime-500` es la acción principal (una sola por pantalla); el amarillo `yellow-400` marca atención; la madera `wood-300` identifica lo que se vende por peso. Fondo de pantalla `surface-page`, tarjetas `surface-card`.
- **Texto.** `ink` para texto principal y `ink-muted` para metadatos, ambos sobre `surface-page` y `surface-card`. Sobre `green-700` usa `on-green` y `lime-200`. Sobre `lime-500` y `lime-100` usa `green-900`. Sobre `yellow-400` usa `yellow-ink`. Nunca pongas `lime-500` como color de texto sobre fondo claro.
- **Tipografía.** Títulos y cifras en Baloo 2 (800), el resto en Nunito. Cargas ambas desde Google Fonts: `https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@500;600;700;800&display=swap`. Usa los estilos `display-xl`, `display-lg`, `title-lg`, `title`, `stat`, `body`, `body-strong`, `eyebrow`, `caption` y `label`; no inventes tamaños.
- **Espaciado.** Margen lateral y separación entre tarjetas `space-4` (16px); padding de tarjeta `space-4`, de la tarjeta principal y el encabezado `space-5`.
- **Formas.** Tarjetas `radius-xl`, botón principal `radius-lg`, botones de ícono, inputs y marca `radius-md`, chips `radius-pill`, encabezado con esquinas inferiores `radius-2xl`.
- **Bordes y sombras.** Tarjetas con borde de 2px `border-card`; separadores punteados `border-dashed`. Solo existen dos sombras, planas y sin desenfoque: `shadow-card` (tarjeta principal) y `shadow-cta` (botón principal).
- **Composición de pantalla.** Encabezado verde con la tarjeta principal montada encima (`tem-overlap`), un único botón principal, luego tarjetas con gráficas o listas, y la navegación inferior de 4 pestañas: Inicio, Productos, Ventas, Más.
- **Táctil.** Todo control mide al menos `size-touch` (44px); el botón principal `size-cta` (68px); las pestañas `size-nav-item` (56px).
- **Foco.** Anillo sólido de 3px `focus-ring` (sobre `green-700` y `green-900`, `on-green`).
- **Estados.** Presionado: el botón principal baja 3px. Error: borde y mensaje `danger` con ícono y texto. Vacío: una frase corta y un botón; sin ilustraciones.
- **Gráficas.** Solo barras. Días pasados `chart-bar`; hoy `lime-500` con borde `green-900`; días futuros línea punteada `chart-empty`. Cifras exactas en texto junto a la gráfica; la barra nunca es la única fuente del dato.

## Componentes

Clases con prefijo `tem-` en `components/bundle.css`, sobre un contenedor `.tem-app`. Cada componente tiene su guía y su vista previa.

- `AppHeader`: encabezado verde con marca, saludo y título.
- `Button`: principal (lima), secundario, oscuro, de texto y de ícono.
- `Card`: tarjeta base y tarjeta principal (hero) superpuesta al encabezado.
- `Chip`: estados de factura, variación del día y tipo de precio (por peso o fijo).
- `StatBlock`: total vendido del día con tres cifras cortas.
- `WeekChart`: barras de la semana con el día de hoy resaltado.
- `ListRow`: fila de ranking con barra de progreso y fila de factura con estado.
- `BottomNav`: navegación inferior de 4 pestañas.
- `Field`: campo de texto con etiqueta, ayuda y error, y control segmentado (Precio fijo / Por peso).

## Iconografía

Íconos en SVG en línea, viewBox 24, `stroke="currentColor"`, `fill="none"`, trazo 2.2 y puntas y uniones redondas (trazo 3 en `+`, ✓ y flechas dentro de chips y botones principales). Tamaños: 22px en navegación y botones de ícono, 26px en el botón principal, 13–14px en chips. Sin emojis, sin íconos rellenos, sin íconos de otras librerías. El ícono solo sin texto lleva `aria-label`.

```
carrito:   M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.76L20 8H6.2  + círculos (9,19,r1.4) (17,19,r1.4)
más:       M12 5v14M5 12h14
inicio:    M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z
productos: M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z  +  M3.5 7.5L12 12l8.5-4.5M12 12v9
ventas:    M6 3h12v18l-3-2-3 2-3-2-3 2z  +  M9 8h6M9 12h6
flecha ↑:  M12 19V5M6 11l6-6 6 6
check:     M5 12.5l4.5 4.5L19 7
reloj:     círculo (12,12,r8.5)  +  M12 7.5V12l3 2
estadística: M4 20V10M10 20V4M16 20v-7M22 20H2
más opciones: tres círculos rellenos (5,12) (12,12) (19,12) r1.7
```

## Logo

El logo oficial está en `assets/Logo/logo-tienda-express-merk.png`: úsalo completo, sin recortar ni redibujar, solo en pantalla de inicio de sesión, carga y material de marketing, a 160px o más de ancho. Dentro de la app (encabezados) se usa la marca de texto: cuadro `lime-500` con el ícono de carrito y "TIENDA EXPRESS Merk" en Baloo 2 mayúsculas; es una simplificación para el encabezado, no reemplaza al logo.

## Reglas de uso

- Una sola acción lima por pantalla; las demás acciones son secundarias, oscuras o de texto.
- Todo dato de venta o de factura lleva su unidad y su moneda; nunca cifras sueltas.
- Un producto por peso muestra el chip `Por peso` y su precio por unidad; uno de precio fijo, `Precio fijo`.
- Si necesitas un color, tamaño o radio que no está en `tokens.json`, no lo inventes: usa el más cercano o propón el token nuevo.
