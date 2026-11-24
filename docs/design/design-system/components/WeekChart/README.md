Gráfica de barras de la semana, de lunes a domingo, con el día de hoy resaltado y los días futuros como línea punteada.

Clases: `tem-chart` con columnas `tem-chart__col` y barras `tem-chart__bar` (`--today`, `--empty`); debajo `tem-chart__labels` con la inicial de cada día y `is-today` en "Hoy".

**Qué aporta quien lo usa:** la altura de cada barra en px (proporcional a las ventas del día, la mayor llena 96px dentro del área de 104px) y el total de la semana en el encabezado de la tarjeta.

- Solo barras, sin ejes ni cuadrícula. El dato exacto se ve en texto (total semanal arriba; al tocar un día, su monto).
- Hoy: `lime-500` con borde `green-900`. Días pasados: `chart-bar`. Futuros: línea punteada, sin altura.
- Una barra sola no debe ser la única forma de saber el valor: pon el monto en texto cuando el usuario toque o seleccione.
- Para el mes, usa la misma gráfica con semanas; no mezcles dos gráficas en una tarjeta.
