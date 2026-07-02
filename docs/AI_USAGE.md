# Uso de IA

Este documento registra como se uso asistencia de IA durante el proyecto. Es un
documento vivo y debe actualizarse en los checkpoints importantes de specs,
implementacion, tests y documentacion.

## Herramientas de IA utilizadas

Durante el desarrollo se utilizaron herramientas de IA como apoyo, no como
fuente automatica de decisiones.

- Claude/Claude Code: usado para preparar el enfoque de trabajo, revisar el challenge,
  estructurar specs, definir vertical slices, analizar tradeoffs, preparar prompts,
  revisar gaps de tests y preparar la defensa tecnica.

- Codex/ChatGPT: usado como asistente de implementacion dentro del editor
  para aplicar cambios acotados por slice, siguiendo los documentos de contexto
  del proyecto y las restricciones definidas previamente.

- Cursor: usado como IDE principal para navegar el codigo, revisar cambios,
  aplicar quick fixes puntuales y validar el codigo terminado durante el flujo
  de desarrollo.

La IA se uso principalmente para:
- convertir el enunciado en specs tecnicas y funcionales;
- proponer planes de implementacion pequenos;
- implementar cambios siguiendo restricciones;
- sugerir tests y detectar gaps;
- revisar documentacion;
- preparar escenarios de defensa y tradeoffs.

Las decisiones finales de arquitectura, alcance, aceptacion de cambios,
validacion y defensa quedaron bajo responsabilidad del desarrollador.

## Estructura de prompts utilizada

Los prompts se escribieron siguiendo una estructura repetible para mantener el
contexto bajo control y evitar cambios fuera de scope:

Ejemplo resumido de prompt:

```text
Estamos trabajando en Slice X: [objetivo].
Contexto: Node.js + TypeScript + Fastify, DDD y arquitectura hexagonal.
Restricciones: no agregar features fuera de scope, no cambiar contratos publicos
sin validacion, mantener cambios pequenos y testeables.
Tarea: proponer primero un plan con archivos afectados y tests. No implementar
hasta validar el plan.

## Checkpoint inicial de specs

El proyecto parte de estos documentos aceptados:

- `docs/PROJECT_CONTEXT.md`
- `docs/PRODUCT_SPEC.md`
- `docs/TECH_SPEC.md`
- `docs/IMPLEMENTATION_PLAN.md`

La IA se uso como apoyo para revisar el alcance, ordenar decisiones y separar la
implementacion en vertical slices pequenos y verificables.

## Decisiones tecnicas iniciales

- Stack base: Node.js con TypeScript.
- Framework HTTP: Fastify.
- No se usa Nest.js.
- La arquitectura hexagonal se va a introducir de forma progresiva en los slices
  funcionales.
- La base documental, MongoDB real, dominio de deliveries, providers, polling y
  webhooks quedan fuera del Slice 1.
- El Slice 1 solo debe entregar una base ejecutable, testeable y facil de
  extender.

## Slice 1: scaffold minimo ejecutable

La IA se uso como apoyo para crear o revisar:

- configuracion de `package.json`;
- configuracion de TypeScript;
- factory minima de Fastify;
- entrypoint local de servidor HTTP;
- endpoint tecnico `GET /health`;
- test HTTP minimo con `app.inject()`.

Este checkpoint no implementa logica de deliveries, dominio, providers,
repositorios, MongoDB real ni endpoints de negocio.

## Slice 2: crear delivery y devolver label

La IA se uso como apoyo para implementar el primer flujo de negocio vertical:

- modelo minimo de dominio para delivery, provider, status y label;
- caso de uso `CreateDelivery` separado de Fastify;
- puerto comun `ShippingProviderPort` para creacion y label;
- adapters mock NRW y TLS;
- seleccion deterministica de provider por `orderReference`;
- repositorio temporal en memoria;
- endpoint `POST /deliveries`;
- tests unitarios y HTTP para el flujo principal y errores esperados.

Decisiones y limites del slice:

- `DEMO-NRW-002` selecciona `NRW`.
- `DEMO-TLS-001` selecciona `TLS`.
- El consumidor no puede enviar `provider` en el request.
- La label es textual y mock.
- El status inicial devuelto es `created`.
- No se implementa MongoDB real.
- No se implementa `GET /deliveries/:id/status`.
- No se implementan polling NRW ni webhook TLS.
- No se agrega idempotencia.

## Slice 3: persistir delivery en MongoDB

La IA se uso como apoyo para reemplazar la persistencia temporal del flujo
principal por MongoDB usando el driver oficial:

- repositorio `MongoDeliveryRepository`;
- mappers explicitos dominio <-> documento Mongo;
- documento Mongo con UUID de dominio como `_id`;
- conexion configurable por `MONGODB_URI` y `MONGODB_DATABASE`;
- soporte local con Docker Compose para levantar MongoDB sin Mongo Atlas;
- indices para busquedas futuras por provider y status;
- tests de mapper, repositorio y persistencia HTTP con `mongodb-memory-server`.

Decisiones y limites del slice:

- Se usa el driver oficial `mongodb`.
- No se usa Mongoose ni ningun ODM.
- El dominio y la aplicacion no importan tipos de MongoDB.
- `POST /deliveries` mantiene el contrato publico del Slice 2.
- No se implementa `GET /deliveries/:id/status`.
- No se implementan polling NRW ni webhook TLS.
- No se agrega idempotencia ni indice unico por `orderReference`.
- No se agrega historial de status.

## Slice 4: consultar ultimo status conocido

La IA se uso como apoyo para implementar la consulta del ultimo status persistido:

- caso de uso `GetDeliveryStatus` separado de Fastify;
- lectura por `DeliveryRepositoryPort.findById`;
- endpoint `GET /deliveries/:id/status`;
- respuesta con `deliveryId`, `status` y `statusUpdatedAt`;
- tests unitarios, HTTP y de persistencia Mongo con `mongodb-memory-server`.

Decisiones y limites del slice:

- La consulta lee desde la persistencia.
- La consulta no llama adapters NRW ni TLS.
- No se implementa polling NRW.
- No se implementa webhook TLS.
- No se agrega historial de status.
- No se agrega idempotencia.
- `POST /deliveries` mantiene su contrato publico.

## Slice 5: simular polling NRW

La IA se uso como apoyo para implementar la actualizacion simulada de status
para deliveries gestionados por NRW:

- puerto especifico `PollingStatusProviderPort`;
- caso de uso `PollNrwDeliveries`;
- busqueda de deliveries NRW no terminales;
- actualizacion persistida del ultimo status conocido;
- adapter mock NRW con polling, simulacion de sin cambios, status desconocido y
  error por delivery;
- job local en proceso con intervalo configurable por `POLLING_INTERVAL_MS`;
- tests unitarios, de repositorio Mongo y de flujo con `GET /deliveries/:id/status`.

Decisiones y limites del slice:

- TLS no implementa polling.
- El timer queda fuera del core; el caso de uso se puede ejecutar manualmente en
  tests.
- Se guarda solo el ultimo status conocido.
- No se implementa webhook TLS.
- No se agrega historial de status.
- No se agregan colas ni scheduler externo.
- No se agrega idempotencia.
- `POST /deliveries` mantiene su contrato publico.
- `GET /deliveries/:id/status` mantiene su contrato publico.

## Slice 6: procesar webhook TLS

La IA se uso como apoyo para implementar la actualizacion simulada de status
para deliveries gestionados por TLS mediante webhook:

- caso de uso `HandleTlsWebhook`;
- endpoint tecnico `POST /webhooks/tls/status`;
- mapper de status externo TLS a status interno;
- busqueda de delivery por provider `TLS` y `providerDeliveryId`;
- reutilizacion de `updateLatestStatus` para persistir el ultimo status conocido;
- tests unitarios, HTTP, de repositorio Mongo y de flujo con
  `GET /deliveries/:id/status`.

Decisiones y limites del slice:

- El webhook es un adapter tecnico para simular TLS, no un nuevo endpoint del
  consumidor interno.
- TLS no implementa `PollingStatusProviderPort`.
- Se guarda solo el ultimo status conocido.
- No se agrega historial de status.
- No se agrega autenticacion ni firma de webhook.
- No se agrega idempotencia.
- No se agrega polling para TLS.
- `POST /deliveries` mantiene su contrato publico.
- `GET /deliveries/:id/status` mantiene su contrato publico.

## Slice 7: hardening de tests, dominio y mappers

La IA se uso como apoyo para revisar gaps de cobertura despues de los flujos
funcionales y agregar tests pequenos de hardening:

- contratos directos de dominio para creacion de delivery, shipment details,
  provider, label y status;
- casos invalidos del mapper Mongo para evitar documentos corruptos en el borde
  de infraestructura;
- comportamiento adicional del mock NRW para avance a `delivered` y deliveries
  terminales sin cambios.

Decisiones y limites del slice:

- No se agregaron endpoints nuevos.
- No se cambio ningun contrato publico.
- No se agrego historial de status.
- No se agrego idempotencia.
- No se agrego autenticacion ni firma de webhooks.
- No se refactorizo la arquitectura.
- La validacion final queda a cargo del desarrollador mediante `npm test` y
  `npm run typecheck`.

## Slice 8: documentacion final y guia local

La IA se uso como apoyo para crear una guia final practica de ejecucion local:

- README con descripcion del microservicio, stack y arquitectura en terminos
  simples;
- comandos reales para instalar dependencias, levantar MongoDB, correr tests,
  hacer typecheck y ejecutar la API;
- ejemplos reproducibles de `POST /deliveries` usando `DEMO-NRW-002` para NRW y
  `DEMO-TLS-001` para TLS;
- pasos para consultar status, demostrar polling NRW y enviar webhook TLS;
- explicacion explicita de tradeoffs y fuera de scope.

Decisiones y limites del slice:

- No se agregaron features nuevas.
- No se cambio logica de produccion.
- No se documento OpenAPI/Swagger porque no esta implementado.
- No se prometieron features fuera del challenge.
- La validacion final queda a cargo del desarrollador mediante `npm test`,
  `npm run typecheck` y `docker compose config`.

## Slice 9: OpenAPI docs y diagrama de arquitectura

La IA se uso como apoyo para agregar documentacion tecnica ligera sobre la API:

- registro de los plugins oficiales `@fastify/swagger` y `@fastify/swagger-ui`;
- exposicion de Swagger UI en `/docs`;
- generacion de OpenAPI desde los schemas ya declarados en las rutas Fastify;
- diagrama Mermaid simple en el README para explicar el flujo de arquitectura;
- smoke test minimo para comprobar que la documentacion se registra.

Decisiones y limites del slice:

- No se cambio logica de negocio.
- No se cambiaron contratos publicos existentes.
- No se agregaron endpoints funcionales nuevos.
- No se agrego OpenAPI manual complejo.
- No se agregaron auth, idempotencia, retries ni historial de status.
- La validacion final queda a cargo del desarrollador mediante `npm test` y
  `npm run typecheck`.

## Responsabilidad final

Las decisiones finales, la revision del codigo, la validacion local y la defensa
tecnica del proyecto quedan a cargo del desarrollador. Cualquier codigo generado
o revisado con apoyo de IA debe poder explicarse, modificarse y testearse.
