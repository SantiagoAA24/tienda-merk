Navegación inferior de cuatro pestañas: Inicio, Productos, Ventas y Más. La pestaña activa muestra una píldora lima detrás del ícono.

Clases: `tem-nav` (contenedor), `tem-nav__item` con `is-active`, `tem-nav__pill` alrededor del ícono.

**Qué aporta quien lo usa:** un `<nav aria-label="Navegación principal">`, un `<button>` o `<a>` por pestaña con `aria-current="page"` en la activa, y el ícono de 22px más su etiqueta.

- Siempre las mismas cuatro pestañas y en el mismo orden; "Más" agrupa estadísticas del mes, cierre de caja y ajustes.
- La acción de vender no va en la navegación: es el botón principal lima de Inicio.
- Cada pestaña mide al menos 56px de alto; la etiqueta nunca se oculta.
- Fijo al borde inferior, con 18px de aire para la barra de gestos del teléfono.
