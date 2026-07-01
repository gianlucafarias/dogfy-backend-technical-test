# Dogfy backend technical test

Microservicio interno de logistica para crear deliveries desde ordenes,
seleccionar un provider mock, guardar la label y consultar el ultimo status
conocido.

La API publica del consumidor interno es pequena:

- `POST /deliveries`
- `GET /deliveries/:id/status`

Tambien existe `POST /webhooks/tls/status` como adapter tecnico para simular
webhooks de TLS, y `GET /health` como healthcheck.

## Stack

- Node.js + TypeScript
- Fastify
- MongoDB con driver oficial
- Docker Compose para MongoDB local
- Vitest

## Arquitectura

La solucion sigue una arquitectura hexagonal pragmatica:

- `src/domain`: conceptos del negocio, como delivery, provider, label y status.
- `src/application`: casos de uso (`CreateDelivery`, `GetDeliveryStatus`,
  `PollNrwDeliveries`, `HandleTlsWebhook`) y puertos.
- `src/infrastructure`: adapters concretos para MongoDB, providers mock, clock,
  ids y polling en proceso.
- `src/http`: rutas Fastify y mapeo HTTP hacia casos de uso.
- `src/composition-root.ts`: wiring de casos de uso y adapters.

## Instalacion

```bash
npm install
```

## MongoDB local

Levantar MongoDB con Docker:

```bash
npm run docker:up
```

Apagarlo:

```bash
npm run docker:down
```

## Configuracion

Crear un `.env` local desde el ejemplo:

```bash
cp .env.example .env
```

Variables disponibles:

```bash
PORT=3000
HOST=0.0.0.0
MONGODB_URI=mongodb://localhost:27017/dogfy-logistics
MONGODB_DATABASE=dogfy-logistics
POLLING_INTERVAL_MS=60000
```

```bash
set -a; source .env; set +a
```

Para probar polling mas rapido en local, podes bajar temporalmente
`POLLING_INTERVAL_MS`, por ejemplo a `2000`.

## Tests y typecheck

```bash
npm test
npm run typecheck
```

Los tests usan `mongodb-memory-server`, asi que no requieren un MongoDB externo.

## Levantar la API

Con MongoDB local corriendo:

```bash
set -a; source .env; set +a
npm run dev
```

Modo sin watch:

```bash
set -a; source .env; set +a
npm start
```

Healthcheck:

```bash
curl http://localhost:3000/health
```

Respuesta esperada:

```json
{ "status": "ok" }
```

## Crear una delivery NRW

`DEMO-NRW-002` selecciona `NRW` de forma reproducible.

```bash
curl -s -X POST http://localhost:3000/deliveries \
  -H "Content-Type: application/json" \
  -d '{
    "orderReference": "DEMO-NRW-002",
    "recipient": {
      "name": "Jane Doe",
      "phone": "+34123456789",
      "email": "jane@example.com"
    },
    "address": {
      "line1": "Calle Example 123",
      "line2": "2A",
      "postalCode": "08001",
      "city": "Barcelona",
      "country": "ES"
    },
    "package": {
      "weightGrams": 1200
    }
  }'
```

La respuesta debe incluir `provider: "NRW"`, `status: "created"` y una label
textual mock.

## Crear una delivery TLS

`DEMO-TLS-001` selecciona `TLS` de forma reproducible.

```bash
curl -s -X POST http://localhost:3000/deliveries \
  -H "Content-Type: application/json" \
  -d '{
    "orderReference": "DEMO-TLS-001",
    "recipient": {
      "name": "Jane Doe",
      "phone": "+34123456789",
      "email": "jane@example.com"
    },
    "address": {
      "line1": "Calle Example 123",
      "line2": "2A",
      "postalCode": "08001",
      "city": "Barcelona",
      "country": "ES"
    },
    "package": {
      "weightGrams": 1200
    }
  }'
```

La respuesta debe incluir `provider: "TLS"`, `status: "created"` y una label
textual mock.

## Consultar status

Reemplazar `<delivery-id>` por el `id` devuelto al crear la delivery:

```bash
curl -s http://localhost:3000/deliveries/<delivery-id>/status
```

La consulta devuelve el ultimo status conocido guardado en MongoDB. No llama al
provider en tiempo real.

## Demostrar polling NRW

Para una demo rapida, usar `POLLING_INTERVAL_MS=2000` en `.env`, exportar las
variables y levantar la API.

1. Crear una delivery con `DEMO-NRW-002`.
2. Consultar su status con `GET /deliveries/:id/status`; al inicio sera
   `created`.
3. Esperar uno o dos intervalos de polling.
4. Consultar nuevamente el status. El mock NRW avanza `created -> in_transit`
   y luego `in_transit -> delivered`.

El polling corre dentro del proceso de la API. No hay worker externo ni cola.

## Demostrar webhook TLS

Crear una delivery con `DEMO-TLS-001`. Su `providerDeliveryId` sera similar a
`tls_DEMO-TLS-001`.

Enviar un webhook mock:

```bash
curl -s -X POST http://localhost:3000/webhooks/tls/status \
  -H "Content-Type: application/json" \
  -d '{
    "providerDeliveryId": "tls_DEMO-TLS-001",
    "status": "DELIVERED"
  }'
```

Despues, consultar:

```bash
curl -s http://localhost:3000/deliveries/<delivery-id>/status
```

El status debe reflejar el ultimo valor persistido. Status TLS soportados:
`READY`, `IN_TRANSIT`, `DELIVERED`, `FAILED`.

## Tradeoffs y fuera de scope

- Los providers son mocks (`NRW` y `TLS`).
- Las labels son textuales mock, no PDFs reales.
- Se guarda solo el ultimo status conocido, no un historial completo.
- El polling de NRW corre en proceso, no en worker externo ni cola.
- El webhook TLS no tiene firma ni autenticacion.
- No hay idempotencia para `POST /deliveries`.
- No hay retries avanzados.
- No hay seleccion manual de provider por parte del consumidor.
- No hay cancelacion, busqueda por order reference, dashboards, billing ni
  tracking en tiempo real.
