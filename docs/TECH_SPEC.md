# Technical Specification

## 1. Resumen tecnico de la solucion

La primera version sera un microservicio Node.js + TypeScript con API HTTP,
persistencia documental en MongoDB y arquitectura hexagonal pragmatica.

El servicio cubre cuatro capacidades:

- crear un delivery desde una orden con `POST /deliveries`;
- seleccionar internamente un provider soportado, NRW o TLS;
- guardar el delivery con label y ultimo status conocido;
- actualizar el status por polling para NRW y por webhook para TLS.

La API publica del consumidor interno queda limitada a:

- `POST /deliveries`;
- `GET /deliveries/:id/status`.

El endpoint de webhook de TLS existe como adapter tecnico para simular el
provider, no como feature del consumidor.

Decision tomada para esta version:

- mantener el dominio y los casos de uso libres de Fastify, MongoDB y formatos
  concretos de providers;
- usar adapters para HTTP, MongoDB, NRW y TLS;
- guardar solo el ultimo status conocido, no un historial de eventos.

Requisitos cubiertos:

- Node.js + TypeScript;
- no usar Nest.js;
- arquitectura hexagonal;
- DDD pragmatico;
- base documental;
- providers detras de interfaz comun;
- crear, guardar y consultar deliveries;
- NRW por polling y TLS por webhook;
- codigo simple de explicar, modificar y defender.

## 2. Framework elegido para Node.js sin Nest.js

Decision tomada: **Fastify**.

Motivo de la decision:

- encaja bien con Node.js + TypeScript sin imponer una arquitectura como Nest.js;
- tiene buen soporte TypeScript;
- permite validar requests y responses con schemas usando Ajv;
- facilita tests HTTP con `app.inject()` sin levantar un servidor real;
- mantiene el borde HTTP separado de los casos de uso;
- evita agregar mas framework del necesario para un microservicio pequeno.

Alternativas evaluadas:

- **Express**: era una opcion valida y conocida, pero hubiera requerido mas
  decisiones manuales alrededor de validacion, errores y testing.
- **Koa**: era una opcion minimalista, pero tambien requeria mas piezas
  manuales para validacion y routing.
- **Hono**: era una opcion moderna y ligera, pero Fastify resultaba mas facil
  de defender para un backend Node.js con MongoDB y tests HTTP simples.

Tradeoff aceptado:

- Fastify agrega una forma concreta de declarar rutas y schemas, pero no impone
  la arquitectura interna del servicio. La arquitectura hexagonal sigue siendo
  una decision del proyecto, no del framework.

Uso previsto:

- Fastify se usara solo en la capa API / HTTP;
- los schemas de request/response viviran en el borde HTTP;
- los DTOs HTTP se traduciran a comandos de aplicacion antes de entrar al caso
  de uso.

Requisitos cubiertos:

- Node.js + TypeScript;
- no Nest.js;
- API HTTP simple;
- tests mantenibles;
- separacion hexagonal.

## 3. Separacion hexagonal propuesta

### Dominio

Contiene reglas y conceptos que no dependen de frameworks ni de infraestructura.

Responsabilidades:

- modelar `Delivery`;
- validar conceptos de dominio como `OrderReference`, `Provider`, `Label` y
  `DeliveryStatus`;
- crear deliveries en estado inicial `created`;
- actualizar el ultimo status conocido solo con status internos soportados.

No debe importar Fastify, MongoDB ni clientes HTTP de providers.

Requisitos cubiertos:

- DDD pragmatico;
- status internos normalizados;
- codigo core testeable con unit tests.

### Aplicacion / casos de uso

Orquesta el dominio usando puertos.

Casos de uso propuestos:

- `CreateDelivery`;
- `GetDeliveryStatus`;
- `PollNrwDeliveries`;
- `HandleTlsWebhook`.

Responsabilidades:

- validar reglas de aplicacion que cruzan varios objetos;
- seleccionar provider;
- llamar al provider para crear delivery y obtener label;
- persistir el delivery;
- consultar el ultimo status conocido desde la base de datos;
- actualizar status desde polling o webhook.

Requisitos cubiertos:

- `POST /deliveries` crea, selecciona provider, genera label y guarda;
- `GET /deliveries/:id/status` lee solo base de datos;
- NRW polling;
- TLS webhook;
- no exponer formatos internos de providers al consumidor.

### Infraestructura

Implementa puertos con tecnologias concretas.

Adapters de infraestructura:

- repositorio documental MongoDB;
- adapter mock NRW;
- adapter mock TLS;
- clock del sistema;
- generador de ids;
- job de polling NRW.

Requisitos cubiertos:

- base de datos no relacional/documental;
- providers mock;
- interfaces comunes por provider;
- polling de NRW.

### API / HTTP

Expone los endpoints y traduce requests/responses.

Responsabilidades:

- validar payloads HTTP;
- mapear errores de aplicacion a HTTP;
- llamar casos de uso;
- devolver DTOs simples al consumidor;
- recibir webhooks TLS y pasarlos al caso de uso correspondiente.

Requisitos cubiertos:

- `POST /deliveries`;
- `GET /deliveries/:id/status`;
- webhook TLS para simulacion;
- errores simples: datos invalidos, delivery no encontrado, fallo de provider.

## 4. Conceptos principales del dominio

### Delivery

Agregado principal del sistema.

Representa un envio creado desde una orden y gestionado por un provider.

Debe contener:

- identificador interno;
- referencia de orden;
- datos necesarios para envio;
- provider seleccionado;
- referencia del delivery en el provider, si existe;
- label imprimible;
- ultimo status interno conocido;
- fecha de creacion;
- fecha de ultima actualizacion de status.

Requisitos cubiertos:

- guardar delivery con campos minimos;
- consultar ultimo status conocido desde base de datos.

### Order reference

Referencia externa de la orden que origina el delivery.

Regla recomendada:

- tratarla como value object no vacio;
- guardarla para trazabilidad;
- no usarla todavia como clave de idempotencia.

Alternativa:

- hacerla unica para evitar duplicados.

Decision tomada:

- no hacerla unica en esta version, porque la idempotencia esta fuera de scope.

Requisitos cubiertos:

- crear delivery desde una orden;
- no agregar idempotencia fuera de scope.

### Provider

Provider soportado por el sistema.

Valores internos:

- `NRW`;
- `TLS`.

Regla recomendada:

- el consumidor no envia el provider en `POST /deliveries`;
- el provider se selecciona internamente;
- el delivery guarda el provider elegido.

Requisitos cubiertos:

- seleccion interna de provider;
- provider guardado en el delivery;
- providers detras de interfaz comun.

### Label

Resultado imprimible devuelto por el provider durante la creacion.

Modelo recomendado para la primera version:

- `format`: formato simple, por ejemplo `text`;
- `content`: contenido imprimible mock.

Alternativa:

- generar y guardar PDFs reales.

Decision tomada:

- no generar PDFs reales en esta version. Una label mock imprimible como texto
  es suficiente para demostrar el flujo sin agregar almacenamiento de archivos.

Requisitos cubiertos:

- provider devuelve label al crear delivery;
- response de `POST /deliveries` incluye label;
- labels pendientes, expiradas o regenerables quedan fuera de scope.

### Delivery status

Status interno normalizado expuesto por el microservicio.

Valores permitidos:

- `created`;
- `in_transit`;
- `delivered`;
- `failed`.

Reglas recomendadas:

- los providers pueden usar status externos distintos;
- cada adapter traduce status externos a estos status internos;
- si un status externo no se reconoce, no debe guardarse como status interno.

Requisitos cubiertos:

- status normalizados;
- provider mock con nombres internos distintos;
- caso borde de status no reconocido.

## 5. Puertos necesarios

### ShippingProviderPort

Puerto comun para crear deliveries en un provider y obtener la label.

Responsabilidad:

- crear el delivery en el provider mock;
- devolver referencia del provider;
- devolver label imprimible;
- devolver el status inicial externo o normalizado.

Decision tomada:

- NRW y TLS implementaran `ShippingProviderPort` porque ambos providers pueden
  crear deliveries y devolver labels.

Requisitos cubiertos:

- cada provider detras de interfaz comun;
- NRW y TLS como providers mock;
- label generada por provider.

### PollingStatusProviderPort

Capacidad adicional para providers que actualizan status por polling.

Responsabilidad:

- consultar el status externo de un delivery ya creado en el provider;
- devolver un status nuevo o indicar que no hubo cambios.

Decision tomada:

- NRW implementara `PollingStatusProviderPort`;
- TLS no implementara polling porque su mecanismo de actualizacion es webhook.

Tradeoff aceptado:

- la interfaz comun entre providers es la operacion de creacion y label, no el
  mecanismo de actualizacion de status. Esto evita forzar a TLS a implementar un
  metodo artificial y mantiene explicita la diferencia real entre polling y
  webhook.

Requisitos cubiertos:

- cada provider detras de interfaz comun;
- NRW y TLS como providers mock;
- label generada por provider;
- NRW actualiza status por polling;
- TLS actualiza status por webhook.

### Delivery repository port

Puerto de persistencia para deliveries.

Operaciones necesarias:

- guardar delivery;
- buscar delivery por id;
- buscar deliveries NRW que deben ser polleados;
- buscar delivery TLS por referencia del provider;
- actualizar ultimo status conocido.

Requisitos cubiertos:

- guardar delivery;
- `GET /deliveries/:id/status` desde base de datos;
- polling NRW;
- webhook TLS.

### Provider selection port o estrategia simple

La seleccion de provider debe ser interna y simple.

Alternativas:

- random entre providers disponibles;
- round-robin en memoria;
- regla deterministica basada en `orderReference`;
- regla fija, por ejemplo siempre NRW.

Decision tomada:

- usar una estrategia deterministica basada en `orderReference`, por ejemplo
  hash simple modulo cantidad de providers disponibles.

Motivos:

- es facil de testear;
- no requiere estado compartido;
- evita comportamiento no reproducible de `random`;
- cumple que el consumidor no elige provider;
- reparte entre NRW y TLS sin optimizacion avanzada.

Requisitos cubiertos:

- seleccion interna entre NRW y TLS;
- no optimizar por precio, velocidad o disponibilidad;
- codigo facil de defender.

### Clock

Puerto para obtener la fecha actual.

Decision tomada:

- inyectar `Clock` en casos de uso que crean o actualizan deliveries.

Requisitos cubiertos:

- `createdAt`;
- `statusUpdatedAt`;
- tests unitarios deterministas.

### Id generator

Puerto para generar ids internos de delivery.

Alternativas:

- usar `ObjectId` de MongoDB como id de dominio;
- generar UUID en la aplicacion.

Decision tomada:

- generar UUID en la aplicacion y guardarlo como `_id` en MongoDB.

Motivos:

- evita filtrar MongoDB dentro del dominio;
- hace los tests mas simples;
- mantiene el id interno independiente de la base documental concreta.

Requisitos cubiertos:

- identificador interno del delivery;
- separacion hexagonal;
- tests mantenibles.

## 6. Adapters necesarios

### HTTP API

Adapter Fastify.

Endpoints:

- `POST /deliveries`;
- `GET /deliveries/:id/status`;
- `POST /webhooks/tls/status`.

El endpoint de webhook no es una feature de negocio para el consumidor interno;
es el adapter que permite simular TLS.

Requisitos cubiertos:

- crear delivery;
- consultar status;
- TLS webhook.

### Mongo/document repository

Implementa `DeliveryRepositoryPort`.

Decision tomada:

- usar el driver oficial de MongoDB;
- mapear explicitamente entre documento Mongo y modelo de dominio;
- mantener validaciones de negocio en dominio/aplicacion, no en Mongo.

Alternativa:

- usar Mongoose.

Motivo de la decision:

- usar driver oficial para evitar magia de ODM y mantener clara la frontera
  hexagonal. Mongoose es valido, pero agrega convenciones que no son necesarias
  para este alcance.

Requisitos cubiertos:

- base no relacional/documental;
- persistencia simple;
- arquitectura hexagonal.

### NRW provider adapter

Adapter mock para provider NRW.

Responsabilidades:

- implementar creacion por `ShippingProviderPort`;
- devolver referencia NRW y label mock;
- implementar `PollingStatusProviderPort` para consultar status externo NRW;
- traducir status externos NRW a status internos.

Simulacion recomendada:

- avanzar status en una secuencia simple cuando el polling consulta el provider:
  `created` -> `in_transit` -> `delivered`;
- permitir que el adapter devuelva "sin cambios" para cubrir ese caso borde.

Requisitos cubiertos:

- provider NRW;
- label al crear delivery;
- actualizaciones por polling;
- status normalizados;
- polling sin cambios.

### TLS provider adapter

Adapter mock para provider TLS.

Responsabilidades:

- implementar creacion por `ShippingProviderPort`;
- devolver referencia TLS y label mock;
- traducir status externos TLS recibidos por webhook a status internos.

No debe implementar `PollingStatusProviderPort`.

Requisitos cubiertos:

- provider TLS;
- label al crear delivery;
- actualizaciones por webhook;
- status normalizados.

### NRW polling job

Adapter que ejecuta periodicamente el caso de uso `PollNrwDeliveries`.

Decision tomada:

- usar un intervalo simple dentro del proceso para esta version;
- en un entorno productivo, el polling podria correr cada hora, como indica el
  requerimiento;
- para ejecucion local y demostracion, el intervalo sera configurable por
  variable de entorno y podra ser mas corto;
- mantener la logica de polling dentro del caso de uso para poder testearla sin
  timers reales.

Alternativa:

- usar una cola o scheduler externo.

Decision tomada:

- no usar colas en esta version. Un intervalo en proceso es suficiente para un
  provider mock y mantiene el alcance defendible.

Tradeoff aceptado:

- el numero exacto de minutos no es la parte importante de la solucion. Lo
  importante es que el status se actualiza de forma asincrona y queda
  persistido para que `GET /deliveries/:id/status` lea el ultimo estado conocido
  desde la base de datos.

Requisitos cubiertos:

- NRW debe simular actualizaciones por polling;
- README debe poder explicar como probar polling;
- no agregar colas avanzadas fuera de scope.

### TLS webhook handler

Adapter HTTP que recibe eventos mock de TLS.

Payload recomendado:

- `providerDeliveryId`;
- `status`.

Flujo:

- validar payload;
- mapear status TLS a status interno;
- buscar delivery por provider `TLS` y referencia del provider;
- actualizar ultimo status conocido.

Requisitos cubiertos:

- TLS debe simular actualizaciones por webhook;
- webhook para delivery inexistente;
- status no reconocido.

## 7. Modelo documental propuesto para Delivery

Coleccion: `deliveries`.

Documento propuesto:

```json
{
  "_id": "9a0f2f8e-7f6f-4b6f-9a2d-2f0b6b3a1d9a",
  "orderReference": "ORDER-123",
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
  },
  "provider": {
    "code": "NRW",
    "deliveryId": "nrw_123"
  },
  "label": {
    "format": "text",
    "content": "Printable mock label"
  },
  "status": "created",
  "createdAt": "2026-07-01T10:00:00.000Z",
  "updatedAt": "2026-07-01T10:00:00.000Z",
  "statusUpdatedAt": "2026-07-01T10:00:00.000Z"
}
```

Indices recomendados:

- `_id` como identificador interno;
- `{ "provider.code": 1, "provider.deliveryId": 1 }` para resolver webhooks TLS;
- `{ "provider.code": 1, "status": 1 }` para encontrar deliveries NRW
  pendientes de polling.

Campos no incluidos en esta version:

- historial de status;
- eventos raw de provider;
- idempotency key;
- informacion de precio;
- tracking en tiempo real;
- datos de billing.

Requisitos cubiertos:

- guardar campos minimos del delivery;
- consultar ultimo status conocido;
- buscar delivery TLS por referencia de provider;
- listar deliveries NRW para polling;
- mantener fuera de scope idempotencia, billing y tracking avanzado.

## 8. Flujo de `POST /deliveries`

1. Fastify recibe `POST /deliveries`.
2. La capa HTTP valida que existan los datos obligatorios:
   - `orderReference`;
   - datos de destinatario;
   - direccion;
   - informacion basica de paquete.
3. La capa HTTP mapea el request a un comando `CreateDelivery`.
4. El caso de uso selecciona provider con la estrategia interna.
5. El caso de uso llama al provider seleccionado mediante `ShippingProviderPort`.
6. El provider mock devuelve:
   - referencia del provider;
   - label imprimible;
   - status inicial esperado.
7. El caso de uso normaliza el status inicial a `created`.
8. El dominio crea el `Delivery` con:
   - id interno generado;
   - provider seleccionado;
   - label;
   - status `created`;
   - timestamps del `Clock`.
9. El repositorio guarda el documento.
10. La API devuelve una respuesta con:
    - id interno;
    - order reference;
    - provider seleccionado;
    - status inicial;
    - label;
    - timestamps relevantes.

Errores:

- request invalido: `400`;
- no hay providers soportados disponibles: `503`;
- provider falla al crear delivery: `502`;
- provider devuelve status no reconocido durante creacion: `502`.

Requisitos cubiertos:

- crear delivery desde una orden;
- consumidor no elige provider;
- provider devuelve label;
- delivery queda guardado;
- respuesta incluye delivery, provider, status y label;
- errores principales simples.

## 9. Flujo de `GET /deliveries/:id/status`

1. Fastify recibe `GET /deliveries/:id/status`.
2. La capa HTTP valida que `id` no este vacio.
3. El caso de uso consulta el delivery en `DeliveryRepositoryPort`.
4. Si no existe, devuelve error de delivery no encontrado.
5. Si existe, devuelve el ultimo status conocido guardado.

Respuesta recomendada:

```json
{
  "deliveryId": "9a0f2f8e-7f6f-4b6f-9a2d-2f0b6b3a1d9a",
  "status": "in_transit",
  "statusUpdatedAt": "2026-07-01T10:05:00.000Z"
}
```

Regla importante:

- este endpoint no llama al provider en tiempo real.

Errores:

- `id` invalido o vacio: `400`;
- delivery inexistente: `404`.

Requisitos cubiertos:

- consultar ultimo status conocido;
- consulta desde base de datos;
- no llamar al provider en tiempo real;
- delivery inexistente.

## 10. Flujo de polling para NRW

1. El polling job ejecuta `PollNrwDeliveries` cada cierto intervalo.
2. El caso de uso busca deliveries con:
   - provider `NRW`;
   - status no terminal, recomendado: distinto de `delivered` y `failed`.
3. Para cada delivery, llama a `PollingStatusProviderPort` usando la referencia
   del provider.
4. El adapter NRW devuelve:
   - un status externo nuevo;
   - o una indicacion de que no hay cambios.
5. El caso de uso traduce el status externo a status interno.
6. Si no hay cambios, conserva el status actual.
7. Si hay cambio valido, actualiza:
   - `status`;
   - `statusUpdatedAt`;
   - `updatedAt`.
8. Si el provider devuelve un status no reconocido:
   - no actualiza el delivery;
   - registra el error;
   - continua con el resto de deliveries.

Decision tomada:

- el polling no debe fallar completo porque un delivery concreto tenga error de
  provider mock.

Requisitos cubiertos:

- NRW actualiza status por polling;
- polling sin cambios conserva status;
- status no reconocido no corrompe el delivery;
- ultimo status queda guardado para `GET /deliveries/:id/status`.

## 11. Flujo de webhook para TLS

1. Fastify recibe `POST /webhooks/tls/status`.
2. La capa HTTP valida payload:
   - `providerDeliveryId`;
   - `status`.
3. El adapter TLS traduce el status externo a status interno.
4. El caso de uso busca un delivery con:
   - provider `TLS`;
   - `provider.deliveryId` igual al `providerDeliveryId` recibido.
5. Si no existe, responde delivery no encontrado.
6. Si existe y el status es valido, actualiza:
   - `status`;
   - `statusUpdatedAt`;
   - `updatedAt`.
7. La respuesta puede devolver el id interno y el status actualizado para hacer
   facil la prueba local.

Respuesta recomendada para webhook aceptado:

```json
{
  "deliveryId": "9a0f2f8e-7f6f-4b6f-9a2d-2f0b6b3a1d9a",
  "status": "delivered"
}
```

Errores:

- payload invalido: `400`;
- status TLS no reconocido: `400`;
- delivery TLS inexistente: `404`.

Requisitos cubiertos:

- TLS actualiza status por webhook;
- webhook para delivery inexistente;
- status no reconocido;
- status normalizado guardado.

## 12. Estrategia de testing

### Unit tests de dominio

Cubrir:

- creacion de `Delivery` con status inicial `created`;
- validacion de `OrderReference`;
- validacion de `Provider`;
- validacion de `Label`;
- actualizacion de status solo con valores internos permitidos;
- timestamps de creacion y actualizacion.

Requisitos cubiertos:

- unit tests de logica core;
- DDD pragmatico;
- status internos normalizados.

### Tests de casos de uso

Cubrir `CreateDelivery`:

- crea delivery con request valido;
- selecciona provider internamente;
- llama al provider seleccionado;
- guarda delivery con label y status `created`;
- falla con datos invalidos;
- falla si no hay providers disponibles;
- falla si el provider falla.

Cubrir `GetDeliveryStatus`:

- devuelve status desde repositorio;
- no llama ningun provider;
- devuelve not found si el delivery no existe.

Cubrir `PollNrwDeliveries`:

- actualiza status si NRW devuelve cambio;
- conserva status si NRW no devuelve cambios;
- ignora status no reconocido sin corromper el documento;
- continua aunque un delivery falle.

Cubrir `HandleTlsWebhook`:

- actualiza delivery TLS existente;
- devuelve not found para delivery inexistente;
- rechaza status externo desconocido.

Requisitos cubiertos:

- flujos principales;
- casos borde relevantes;
- comportamiento defendible de polling y webhook.

### Tests de mappers/provider adapters

Cubrir:

- mapper request HTTP -> comando de aplicacion;
- mapper dominio -> response HTTP;
- mapper documento Mongo -> dominio;
- mapper dominio -> documento Mongo;
- mapper status NRW -> status interno;
- mapper status TLS -> status interno;
- label mock devuelta por NRW y TLS.

Requisitos cubiertos:

- providers pueden usar nombres distintos internamente;
- consumidor ve status normalizados;
- Mongo no filtra detalles al dominio;
- HTTP no filtra detalles al dominio.

### Integracion opcional

Recomendado si el tiempo lo permite:

- tests HTTP con Fastify `app.inject()`;
- repositorio Mongo contra `mongodb-memory-server` o MongoDB en Docker;
- flujo completo:
  - crear delivery;
  - consultar status;
  - simular polling NRW;
  - simular webhook TLS.

No es necesario agregar tests end-to-end pesados ni colas reales.

Requisitos cubiertos:

- setup local verificable;
- README posterior con pasos de prueba;
- mantener implementacion simple.

## 13. Tradeoffs aceptados

- Se guarda solo el ultimo status conocido, no historial completo.
  - Cubre el requisito de `GET /deliveries/:id/status`.
  - Evita agregar auditoria fuera de scope.

- La seleccion de provider es deterministica y simple, no optimizada.
  - Cubre la seleccion interna.
  - Evita reglas de coste, velocidad o disponibilidad fuera de scope.

- El polling NRW corre en proceso.
  - Cubre la simulacion por polling.
  - Evita colas o schedulers externos fuera de scope.

- La label es mock y textual.
  - Cubre label imprimible en creacion.
  - Evita generacion y almacenamiento real de PDFs fuera de scope.

- No hay idempotencia de creacion.
  - Respeta el fuera de scope del product spec.
  - Acepta que un retry del consumidor podria crear otro delivery.

- No hay autenticacion ni firma de webhook en esta version.
  - Mantiene el test tecnico simple.
  - Se reconoce como riesgo para produccion real.

- Se usa MongoDB driver oficial en vez de ODM.
  - Mantiene mapeos explicitos y arquitectura hexagonal clara.
  - Acepta escribir algo mas de codigo de mapping.

### Nota sobre uso de IA

El uso de IA se documentara en `docs/AI_USAGE.md` o en el README.

La IA se uso como apoyo para comparar alternativas, revisar riesgos, generar
borradores y mejorar tests/documentacion. Las decisiones finales, la revision y
la validacion quedan a cargo del desarrollador. Cualquier codigo generado con
apoyo de IA debe poder explicarse, modificarse y testearse.

## 14. Riesgos conocidos

- Duplicados por retries del consumidor.
  - Motivo: idempotencia esta fuera de scope.

- Polling en proceso no es robusto para multiples instancias.
  - Motivo: no se usan locks, colas ni scheduler externo.

- Webhook TLS sin firma podria aceptar eventos falsos en un sistema real.
  - Motivo: seguridad de webhook queda fuera de esta version.

- Sin historial de status hay menos trazabilidad operativa.
  - Motivo: el producto pide ultimo status conocido, no auditoria completa.

- Los providers mock pueden no representar fallos reales de integraciones
  externas.
  - Motivo: esta version prueba arquitectura y flujo, no integracion real.

- MongoDB permite documentos flexibles y podria haber drift de esquema.
  - Mitigacion: mappers explicitos, validacion HTTP y tests de repositorio.

- Si el status externo no se reconoce, el delivery puede quedar con status
  anterior.
  - Mitigacion: no guardar estados invalidos y registrar el error.

## 15. Mejoras futuras fuera de esta version

Estas mejoras quedan explicitamente fuera de la primera version:

- idempotencia por `Idempotency-Key` u `orderReference`;
- retries con backoff para fallos temporales de providers;
- cola o scheduler externo para polling;
- locks para polling en multiples instancias;
- historial de eventos/status;
- busqueda por referencia de orden;
- cancelacion de deliveries;
- seleccion avanzada por coste, SLA, zona o disponibilidad;
- labels PDF reales, almacenamiento de archivos y regeneracion;
- autenticacion y firma de webhooks;
- observabilidad avanzada con metricas y tracing;
- dashboards operativos;
- notificaciones al cliente final;
- billing y conciliacion;
- gestion de devoluciones;
- reclamos o incidencias operativas.
