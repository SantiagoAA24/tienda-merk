# Plan de desarrollo – Tienda Express Merk

PWA de ventas y facturación electrónica DIAN para la tienda. Documento para Santiago: decisiones técnicas, modelo de datos, integración con el proveedor y fases. Lo marcado con ⚠️ hay que validarlo con el contador o con el proveedor antes de construir.

## 1. Decisiones clave

- **No conectarse directo a la DIAN.** Se integra un proveedor tecnológico por API (Alegra, Factus, Siigo, The Factory HKA u otro). Ellos manejan certificado, firma, CUFE, envío y validación.
- **Un solo adaptador.** La app habla con una interfaz propia `InvoiceProvider`; cambiar de proveedor es cambiar un archivo.
- **Offline primero para vender.** Vender nunca debe depender del internet: la venta se guarda en el celular y la factura se envía después.
- **La app es la fuente de verdad de la venta; el proveedor lo es de la factura.** Guardamos el XML/PDF y el CUFE que devuelve.
- **Simple.** Un negocio, pocos usuarios, una sola base de datos.

## 2. Arquitectura

- **Frontend:** React + TypeScript, PWA (service worker, manifest), IndexedDB para el catálogo y la cola de ventas pendientes. Estilos con los tokens del sistema de diseño `tem`.
- **Backend:** FastAPI (Python) con PostgreSQL.
- **Cola de envío:** tabla `outbox` en la misma base + un worker (arq o Celery con Redis, o un proceso simple con reintentos). Reintentos con espera creciente.
- **Proveedor DIAN:** adaptador HTTP con las credenciales guardadas como secretos del servidor, nunca en el celular.
- **Despliegue:** un contenedor para la API y otro para el worker, Postgres administrado, HTTPS, copias de seguridad diarias.

```
Celular (PWA) --HTTPS--> FastAPI --> PostgreSQL
   IndexedDB                 |
   cola offline              +--> worker (outbox) --> Proveedor tecnológico --> DIAN
```

## 3. Modelo de datos

- **business:** id, nombre, NIT, dirección, teléfono, proveedor, datos de resolución (número, prefijo, rango, vigencia).
- **user:** id, business\_id, nombre, usuario, hash de contraseña, rol (`admin` | `seller`), activo.
- **product:** id, nombre, tipo de precio (`fixed` | `weight`), precio, unidad (`und` | `g` | `kg` | `lb`), IVA (`excluido` | `exento` | `5` | `19`), costo (opcional), activo.
- **sale:** id (UUID generado en el celular), business\_id, user\_id, fecha y hora, subtotal, impuestos, total, medio de pago, efectivo recibido, cliente (opcional), número interno.
- **sale\_line:** sale\_id, product\_id, nombre y precio congelados al momento de la venta, cantidad (decimal), unidad, IVA, total de la línea.
- **customer:** id, tipo y número de documento, nombre o razón social, correo. Consumidor final no crea registro.
- **invoice:** sale\_id, número (`FE-0232`), estado (`pending` | `sent` | `accepted` | `rejected`), CUFE, motivo de rechazo, enlaces al PDF y XML, intentos, último intento.
- **outbox:** id, tipo, payload, estado, intentos, próxima ejecución.
- **cash\_closing:** fecha, base, efectivo esperado, efectivo contado, diferencia, usuario.

Reglas importantes:

- El **UUID de la venta se crea en el celular**. Si el envío se repite, el servidor no duplica (idempotencia).
- Precio y nombre se **copian a la línea**: cambiar un producto no altera facturas pasadas.
- Cantidades y dinero con tipos decimales exactos; en pesos colombianos sin centavos en pantalla.
- ⚠️ La **numeración consecutiva** y la resolución la controla el servidor, no el celular. Si el celular está sin internet, la venta lleva número interno y recibe el número FE al sincronizar. Validar con el contador y el proveedor si esto es aceptable o si hace falta un esquema de contingencia.

## 4. Ciclo de vida de una factura

1. El vendedor cobra: la venta se guarda en IndexedDB y se muestra “Venta registrada”.
2. Si hay internet, se envía al servidor; si no, queda en cola (pantalla “Sin conexión”).
3. El servidor guarda la venta, crea la factura en `pending` y una tarea en `outbox`.
4. El worker llama al proveedor. Respuesta aceptada → `accepted` con CUFE y PDF. Error temporal → reintento. Rechazo → `rejected` con el motivo.
5. Estados en pantalla: **Aceptada**, **Por reenviar** (pendiente o error temporal), **Rechazada** (hay que corregir un dato y reenviar).
6. La app consulta el estado al abrir Ventas y cada vez que vuelve el internet.

## 5. Integración con el proveedor

```python
class InvoiceProvider(Protocol):
    def emit(self, invoice: InvoiceDraft) -> EmitResult: ...
    def status(self, provider_id: str) -> StatusResult: ...
    def download(self, provider_id: str, kind: Literal['pdf','xml']) -> bytes: ...
```

- Un adaptador por proveedor; el resto del sistema no sabe cuál se usa.
- Se mapean errores del proveedor a tres categorías: **temporal** (reintentar), **de datos** (rechazada, corregir) y **de configuración** (avisar a quien administra).
- Webhooks del proveedor, si existen, actualizan el estado; si no, el worker consulta periódicamente.
- Entorno de pruebas (habilitación) separado del de producción, con credenciales distintas.
- ⚠️ **Elegir proveedor** comparando: precio por documento o plan mensual, API documentada con sandbox, soporte en español, y que cubra factura electrónica de venta y documento equivalente POS si aplica.

## 6. API (resumen)

- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- `GET/POST/PATCH /products`
- `POST /sales` (idempotente por UUID), `GET /sales?from&to&status`, `GET /sales/{id}`
- `POST /invoices/{sale_id}/retry` (reenviar), `GET /invoices/{id}/pdf`
- `GET /stats/summary?period=week|month`, `GET /stats/top-products`
- `POST /closings`, `GET/POST/PATCH /users`, `GET/PATCH /business`

## 7. Seguridad y datos

- Contraseñas con argon2 o bcrypt; sesiones con token de acceso corto y refresco; cierre de sesión remoto.
- Roles aplicados en el servidor (el vendedor no ve costos ni usuarios).
- Credenciales del proveedor solo en el servidor (variables de entorno o gestor de secretos).
- Datos de clientes (documento, correo) son datos personales: política de tratamiento y mínimo necesario. ⚠️ Revisar obligaciones de la Ley 1581 con el contador o asesor.
- Copias de seguridad diarias y prueba de restauración.
- ⚠️ Conservación de facturas: confirmar el tiempo obligatorio y que el proveedor las conserve.

## 8. Fases

**Fase 0 – Definiciones (1 semana)**

- Confirmar con el contador: obligación, régimen, categorías de IVA, documento a emitir.
- Elegir proveedor y abrir cuenta de pruebas.
- Pedir o confirmar la resolución de numeración.

**Fase 1 – Venta sin factura real (2–3 semanas)**

- Login, catálogo (precio fijo y por peso), calculadora de venta, cobro, historial y cierre del día. Todo offline.
- Meta: la tienda ya puede registrar ventas en lugar del cuaderno.

**Fase 2 – Factura electrónica (2–3 semanas)**

- Adaptador del proveedor en pruebas, cola con reintentos, estados Aceptada / Por reenviar / Rechazada, PDF y compartir por WhatsApp o correo.
- Datos del cliente (cédula o NIT).

**Fase 3 – Producción y estadísticas (1–2 semanas)**

- Paso a producción con la resolución real, estadísticas, usuarios y roles, copias de seguridad.

**Después (si hace falta):** fiado, inventario con alertas, cierre de caja con varios turnos, impresión de tirilla.

## 9. Riesgos y pendientes

- ⚠️ Que el contador confirme el tipo de documento (factura electrónica vs. documento equivalente) para ventas pequeñas.
- ⚠️ Cómo se maneja la numeración al vender sin internet.
- Internet inestable en la tienda: probar de verdad en el local, no solo en pruebas.
- Balanza: por ahora el peso se digita a mano; integrar balanza es un proyecto aparte.
- Costos recurrentes del proveedor y del hosting: acordarlos con el dueño antes de empezar.
