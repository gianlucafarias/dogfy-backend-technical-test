# Implementation Plan

Este plan divide la implementacion en vertical slices verificables. Cada slice
debe entregar un comportamiento demostrable de punta a punta o dejar una base
minima validada para el siguiente slice.

Las specs de producto y tecnica ya estan aceptadas. Este documento no cambia el
scope: no agrega cancelaciones, idempotencia, retries avanzados, colas,
historial de status, auth, dashboards, billing ni seleccion avanzada de
provider.

Reglas transversales para todos los slices:

- Cada slice funcional debe incluir sus tests minimos dentro de sus propios
  criterios de aceptacion. El slice final de tests no reemplaza esos tests; solo
  endurece cobertura y cierra gaps.
- La seleccion de provider sigue siendo interna. Para demo y tests
  reproducibles, la estrategia deterministica debe quedar fijada y cubierta por
  tests. Contrato propuesto: ordenar providers como `[NRW, TLS]`, calcular un
  hash simple sobre `orderReference` normalizado y elegir por modulo. Con ese
  contrato, los ejemplos documentados deben ser:
  - `DEMO-NRW-002` resuelve a `NRW`;
  - `DEMO-TLS-001` resuelve a `TLS`.
- `docs/AI_USAGE.md` debe crearse temprano, durante el scaffold o justo despues
  de las specs aceptadas, y mantenerse como documento vivo. Debe actualizarse en
  checkpoints de specs, decisiones tecnicas, implementacion, tests y
  documentacion. Debe dejar claro que la IA asistio, pero que las decisiones
  finales y la validacion fueron del desarrollador.

## Slice 1 - Scaffold minimo del proyecto

### 1. Nombre

Scaffold minimo ejecutable.

### 2. Objetivo

Crear la base minima de un proyecto Node.js + TypeScript sin Nest.js que permita
levantar una API HTTP, ejecutar tests y mantener la arquitectura hexagonal
pragmatica definida en la spec tecnica.

### 3. Requisitos que cubre

- Node.js + TypeScript.
- No usar Nest.js.
- Fastify como framework HTTP.
- Arquitectura hexagonal pragmatica.
- Codigo simple de explicar, modificar y defender.
- Base para tests unitarios y HTTP.
- Creacion temprana de `docs/AI_USAGE.md` como documento vivo.

### 4. Comportamiento entregado

- El proyecto instala dependencias, compila TypeScript y ejecuta tests.
- La aplicacion Fastify puede construirse desde codigo y responder a un endpoint
  tecnico minimo, por ejemplo healthcheck, solo para verificar que el runtime
  funciona.
- La configuracion de entorno permite separar ejecucion local, tests y
  parametros como MongoDB y polling interval.
- `docs/AI_USAGE.md` queda creado con los checkpoints iniciales de specs y
  decisiones tecnicas aceptadas, y con una nota clara de responsabilidad del
  desarrollador sobre decisiones finales y validacion.
- No se implementa aun ningun comportamiento de deliveries.

### 5. Tests esperados

- Test minimo que construye la app y verifica que Fastify responde.
- Test o comando de typecheck que confirma que TypeScript compila.
- Script de test disponible desde `npm test`.

### 6. Criterios de aceptacion

- `npm install` instala el proyecto sin pasos manuales extra.
- `npm test` pasa.
- `npm run build` o `npm run typecheck` pasa.
- La app puede levantarse localmente.
- `docs/AI_USAGE.md` existe y registra el checkpoint de specs y decisiones
  tecnicas iniciales.
- No hay controllers, repositorios o modelos de negocio implementados todavia.
- El scaffold no introduce features fuera de scope.

### 7. Riesgos o tradeoffs

- Si el scaffold intenta anticipar demasiada estructura, puede volver la solucion
  mas dificil de defender.
- Si el scaffold queda demasiado vacio, los siguientes slices podrian necesitar
  reordenar archivos.
- Tradeoff aceptado: crear solo lo necesario para ejecutar, testear y alojar los
  slices siguientes.

### 8. Mensaje de commit sugerido

`chore: add minimal TypeScript Fastify scaffold`

## Slice 2 - Crear delivery y devolver label

### 1. Nombre

Creacion de delivery con provider mock y label.

### 2. Objetivo

Implementar `POST /deliveries` como primer flujo de negocio verificable: recibir
una orden valida, seleccionar internamente un provider soportado, crear el
delivery con el provider mock y devolver una label imprimible con status inicial
`created`.

### 3. Requisitos que cubre

- `POST /deliveries` crea un delivery desde una orden.
- El consumidor no envia ni elige provider.
- El sistema selecciona NRW o TLS internamente.
- Providers detras de una interfaz comun para creacion y label.
- La respuesta incluye delivery, provider seleccionado, status inicial y label.
- Errores simples para datos invalidos, provider no disponible y fallo de
  provider.

### 4. Comportamiento entregado

- `POST /deliveries` valida un payload con:
  - `orderReference`;
  - destinatario;
  - direccion;
  - paquete.
- El caso de uso selecciona provider con una estrategia deterministica basada en
  `orderReference`.
- La estrategia de seleccion queda cubierta por tests y permite demos
  reproducibles sin aceptar provider en el request:
  - `DEMO-NRW-002` debe crear un delivery `NRW`;
  - `DEMO-TLS-001` debe crear un delivery `TLS`.
- NRW y TLS pueden crear deliveries mediante el mismo puerto de creacion.
- El provider mock devuelve `providerDeliveryId` y una label textual imprimible.
- La respuesta devuelve un delivery creado con:
  - id interno;
  - order reference;
  - provider seleccionado;
  - provider delivery id;
  - label;
  - status `created`;
  - timestamps.
- En este slice puede usarse un repositorio en memoria si MongoDB aun no esta
  integrado, porque la persistencia documental llega en el siguiente slice.

### 5. Tests esperados

- Caso de uso `CreateDelivery` crea un delivery valido.
- La seleccion de provider es interna, deterministica y testeable.
- La seleccion de provider prueba los ejemplos `DEMO-NRW-002` -> `NRW` y
  `DEMO-TLS-001` -> `TLS`.
- El provider seleccionado recibe el comando esperado.
- La respuesta incluye label y status `created`.
- Request invalido devuelve `400`.
- Provider no disponible devuelve `503`.
- Fallo de provider devuelve `502`.
- Provider con status inicial no reconocido devuelve `502`.
- Test HTTP con Fastify `app.inject()` para el camino feliz de
  `POST /deliveries`.

### 6. Criterios de aceptacion

- Se puede llamar a `POST /deliveries` con datos validos y recibir una label.
- El request no acepta `provider` como decision del consumidor.
- Se puede demostrar la creacion de un delivery NRW usando `DEMO-NRW-002`.
- Se puede demostrar la creacion de un delivery TLS usando `DEMO-TLS-001`.
- La respuesta expone solo status internos normalizados.
- El delivery creado siempre inicia en `created`.
- Los tests minimos de este slice pasan dentro de `npm test`.
- El flujo funciona sin MongoDB real en este slice, si el repositorio usado es
  explicitamente temporal y reemplazable.

### 7. Riesgos o tradeoffs

- El repositorio temporal permite demostrar el flujo antes de MongoDB, pero no
  prueba persistencia real.
- La seleccion deterministica no optimiza coste, velocidad ni disponibilidad.
- Las labels textuales son suficientes para la prueba, pero no representan PDFs
  reales.

### 8. Mensaje de commit sugerido

`feat: create deliveries with provider label`

## Slice 3 - Persistir delivery en MongoDB

### 1. Nombre

Persistencia documental de deliveries.

### 2. Objetivo

Reemplazar la persistencia temporal por MongoDB usando el driver oficial y
mappers explicitos, manteniendo el dominio y los casos de uso libres de detalles
de infraestructura.

### 3. Requisitos que cubre

- Base de datos no relacional/documental.
- Guardar delivery despues de crearlo.
- Delivery guardado con campos minimos requeridos.
- UUID interno como `_id` persistido.
- Mapeo explicito documento Mongo <-> dominio.
- Indices para resolver webhooks TLS y polling NRW.

### 4. Comportamiento entregado

- `POST /deliveries` guarda el delivery en la coleccion `deliveries`.
- El documento persistido contiene:
  - `_id`;
  - `orderReference`;
  - recipient;
  - address;
  - package;
  - provider code;
  - provider delivery id;
  - label;
  - status;
  - `createdAt`;
  - `updatedAt`;
  - `statusUpdatedAt`.
- La configuracion local permite conectar a MongoDB.
- El repositorio expone operaciones necesarias para slices posteriores:
  - guardar delivery;
  - buscar por id;
  - buscar NRW pendientes de polling;
  - buscar TLS por provider delivery id;
  - actualizar ultimo status conocido.
- La app crea los indices recomendados o documenta claramente como crearlos.

### 5. Tests esperados

- Mapper dominio -> documento Mongo.
- Mapper documento Mongo -> dominio.
- Repositorio guarda y recupera un delivery por id.
- Repositorio no filtra detalles de MongoDB hacia el dominio.
- Test de `POST /deliveries` verifica que el delivery queda persistido.
- Si se usa MongoDB real en tests, cubrir setup con Docker o
  `mongodb-memory-server`.

### 6. Criterios de aceptacion

- Crear un delivery lo deja guardado en MongoDB.
- El documento coincide con el modelo documental de la spec tecnica.
- El dominio no importa tipos del driver de MongoDB.
- Los tests minimos de persistencia, repositorio y mappers Mongo corren de forma
  reproducible dentro de `npm test`.
- No se agrega idempotencia ni unicidad por `orderReference`.

### 7. Riesgos o tradeoffs

- El driver oficial exige escribir mappers manuales, pero mantiene clara la
  frontera hexagonal.
- MongoDB permite drift de esquema; se mitiga con validacion HTTP, mappers
  explicitos y tests.
- Tests con MongoDB pueden ser mas lentos que tests unitarios puros.

### 8. Mensaje de commit sugerido

`feat: persist deliveries in MongoDB`

## Slice 4 - Consultar ultimo status conocido

### 1. Nombre

Consulta de status desde base de datos.

### 2. Objetivo

Implementar `GET /deliveries/:id/status` para devolver el ultimo status conocido
persistido, sin llamar en tiempo real al provider.

### 3. Requisitos que cubre

- `GET /deliveries/:id/status`.
- Consultar ultimo status conocido.
- La consulta usa la base de datos como fuente.
- La consulta no llama al provider en tiempo real.
- Delivery inexistente devuelve error simple.

### 4. Comportamiento entregado

- `GET /deliveries/:id/status` valida que el id no este vacio.
- El caso de uso busca el delivery por id en el repositorio.
- Si existe, devuelve:
  - `deliveryId`;
  - `status`;
  - `statusUpdatedAt`.
- Si no existe, devuelve `404`.
- Ningun adapter de provider participa en esta consulta.

### 5. Tests esperados

- `GetDeliveryStatus` devuelve status desde repositorio.
- `GetDeliveryStatus` no llama ningun provider.
- Delivery inexistente devuelve not found.
- Id vacio o invalido devuelve `400`.
- Test HTTP con Fastify `app.inject()` para:
  - delivery encontrado;
  - delivery inexistente.

### 6. Criterios de aceptacion

- Despues de crear un delivery, `GET /deliveries/:id/status` devuelve `created`.
- Si el status cambia por otro slice, este endpoint devuelve el valor persistido.
- El endpoint no consulta NRW ni TLS.
- La respuesta usa status internos normalizados.
- Los tests minimos de caso de uso y HTTP de este slice pasan dentro de
  `npm test`.

### 7. Riesgos o tradeoffs

- Al guardar solo el ultimo status no hay auditoria ni historial.
- La consulta puede devolver un status anterior si aun no corrio polling o no
  llego webhook.
- Tradeoff aceptado: el producto pide ultimo status conocido, no tracking en
  tiempo real.

### 8. Mensaje de commit sugerido

`feat: expose latest delivery status`

## Slice 5 - Simular polling NRW

### 1. Nombre

Actualizacion de status NRW por polling.

### 2. Objetivo

Implementar la simulacion de polling para deliveries gestionados por NRW, de
forma que el sistema actualice el ultimo status conocido en MongoDB y
`GET /deliveries/:id/status` pueda mostrar el cambio persistido.

### 3. Requisitos que cubre

- NRW debe simular actualizaciones por polling.
- Buscar deliveries NRW no terminales.
- Actualizar status si el provider devuelve cambio.
- Conservar status si no hay cambios.
- Ignorar status no reconocidos sin corromper el delivery.
- Polling en proceso con intervalo configurable para demo local.

### 4. Comportamiento entregado

- Existe un caso de uso `PollNrwDeliveries`.
- El repositorio devuelve deliveries con provider `NRW` y status no terminal.
- La demo y los tests crean un delivery NRW usando `orderReference`
  `DEMO-NRW-002`, respetando que el consumidor no elige provider.
- El adapter NRW implementa una capacidad de polling que puede devolver:
  - nuevo status externo;
  - sin cambios;
  - status no reconocido;
  - error para un delivery concreto.
- El caso de uso mapea status NRW a status internos.
- Si hay cambio valido, se actualizan `status`, `statusUpdatedAt` y `updatedAt`.
- Si no hay cambios, el documento queda igual.
- Si un delivery falla, el polling continua con los demas.
- Un job en proceso ejecuta el caso de uso con intervalo configurable.

### 5. Tests esperados

- `PollNrwDeliveries` actualiza `created` -> `in_transit` o `delivered` cuando
  NRW devuelve cambio.
- `PollNrwDeliveries` conserva status cuando NRW devuelve sin cambios.
- Status NRW desconocido no se guarda.
- Error en un delivery no detiene el resto del polling.
- Mapper status NRW -> status interno.
- Test de integracion o HTTP demuestra:
  - crear delivery NRW con `DEMO-NRW-002`;
  - ejecutar polling manualmente o con intervalo corto;
  - consultar status actualizado con `GET /deliveries/:id/status`.

### 6. Criterios de aceptacion

- Un delivery NRW puede avanzar de status por polling.
- El status actualizado queda persistido en MongoDB.
- `GET /deliveries/:id/status` refleja el ultimo valor persistido.
- Deliveries terminales no se pollean.
- Los tests minimos de polling, mapper NRW y flujo demostrable pasan dentro de
  `npm test`.
- No se introducen colas ni scheduler externo.

### 7. Riesgos o tradeoffs

- Polling en proceso no es robusto para multiples instancias.
- El intervalo corto sirve para demo, pero no representa una cadencia real de
  produccion.
- El provider mock puede ser mas predecible que una integracion externa real.

### 8. Mensaje de commit sugerido

`feat: update NRW deliveries by polling`

## Slice 6 - Procesar webhook TLS

### 1. Nombre

Actualizacion de status TLS por webhook.

### 2. Objetivo

Implementar `POST /webhooks/tls/status` para recibir eventos mock de TLS,
identificar el delivery correspondiente, normalizar el status externo y guardar
el ultimo status conocido.

### 3. Requisitos que cubre

- TLS debe simular actualizaciones por webhook.
- El webhook identifica deliveries por `providerDeliveryId`.
- Los status TLS se traducen a status internos.
- Delivery TLS inexistente devuelve `404`.
- Status TLS no reconocido devuelve `400`.
- El consumidor no necesita conocer formatos internos de TLS.

### 4. Comportamiento entregado

- `POST /webhooks/tls/status` valida:
  - `providerDeliveryId`;
  - `status`.
- El handler llama al caso de uso `HandleTlsWebhook`.
- La demo y los tests crean un delivery TLS usando `orderReference`
  `DEMO-TLS-001`, respetando que el consumidor no elige provider.
- El caso de uso busca delivery con provider `TLS` y provider delivery id.
- El adapter o mapper TLS traduce el status externo.
- Si el delivery existe y el status es valido, se actualizan:
  - `status`;
  - `statusUpdatedAt`;
  - `updatedAt`.
- La respuesta devuelve `deliveryId` y status actualizado para facilitar la demo
  local.

### 5. Tests esperados

- `HandleTlsWebhook` actualiza delivery TLS existente.
- Webhook para delivery inexistente devuelve not found.
- Status externo desconocido se rechaza y no actualiza MongoDB.
- Mapper status TLS -> status interno.
- Payload invalido devuelve `400`.
- Test HTTP con Fastify `app.inject()` para webhook aceptado.
- Test de flujo:
  - crear delivery TLS con `DEMO-TLS-001`;
  - enviar webhook;
  - consultar status con `GET /deliveries/:id/status`.

### 6. Criterios de aceptacion

- Un delivery TLS puede avanzar de status por webhook.
- El status actualizado queda persistido.
- `GET /deliveries/:id/status` refleja el cambio despues del webhook.
- El endpoint de webhook no se presenta como feature del consumidor interno,
  sino como adapter tecnico de simulacion.
- Los tests minimos de webhook, mapper TLS y flujo demostrable pasan dentro de
  `npm test`.
- No se agrega autenticacion ni firma de webhook en esta version.

### 7. Riesgos o tradeoffs

- Webhook sin firma no seria suficiente para produccion real.
- El endpoint facilita la prueba tecnica, pero no modela toda la seguridad de
  una integracion externa.
- Buscar por provider delivery id requiere indice para evitar problemas si el
  volumen creciera.

### 8. Mensaje de commit sugerido

`feat: handle TLS status webhooks`

## Slice 7 - Hardening de tests, dominio y mappers

### 1. Nombre

Hardening y final coverage pass.

### 2. Objetivo

Completar gaps de cobertura despues de que cada slice funcional ya tenga sus
tests minimos. Este slice revisa la suite completa, endurece contratos de
dominio y mapping, y asegura que `npm test` cubre lo importante sin convertir la
prueba en una suite pesada.

### 3. Requisitos que cubre

- Hardening de unit tests de logica core.
- Revision final de tests de casos de uso principales.
- Revision final de mappers/provider adapters.
- Status internos normalizados.
- Providers con formatos propios ocultos al consumidor.
- MongoDB y HTTP separados del dominio.

### 4. Comportamiento entregado

- La suite de tests documenta el comportamiento esperado del sistema y no deja
  los flujos principales cubiertos solo de forma manual.
- Dominio valida conceptos principales:
  - `Delivery`;
  - `OrderReference`;
  - `Provider`;
  - `Label`;
  - `DeliveryStatus`.
- Casos de uso quedan cubiertos:
  - `CreateDelivery`;
  - `GetDeliveryStatus`;
  - `PollNrwDeliveries`;
  - `HandleTlsWebhook`.
- Mappers quedan cubiertos:
  - request HTTP -> comando;
  - dominio -> response HTTP;
  - dominio -> documento Mongo;
  - documento Mongo -> dominio;
  - NRW status -> status interno;
  - TLS status -> status interno.
- Los tests explican con nombres claros los casos borde relevantes.
- `docs/AI_USAGE.md` se actualiza con el checkpoint de tests, indicando que la
  IA pudo asistir en revisar casos y gaps, pero que la validacion final fue del
  desarrollador.

### 5. Tests esperados

- Creacion de `Delivery` con status inicial `created`.
- Actualizacion solo con status internos permitidos.
- Validacion de order reference, provider y label.
- `CreateDelivery` cubre camino feliz y errores principales.
- `GetDeliveryStatus` prueba que no llama providers.
- `PollNrwDeliveries` cubre cambio, sin cambios, status desconocido y fallo
  parcial.
- `HandleTlsWebhook` cubre actualizacion, not found y status desconocido.
- Mappers de Mongo, HTTP, NRW y TLS con casos felices y casos invalidos.
- Tests de provider selection mantienen los ejemplos documentados:
  `DEMO-NRW-002` -> `NRW` y `DEMO-TLS-001` -> `TLS`.
- Comando unico de test que corra todo lo anterior.

### 6. Criterios de aceptacion

- `npm test` pasa de forma reproducible.
- `npm test` incluye los tests minimos agregados en cada slice funcional, no
  solo tests escritos al final.
- Los tests cubren el comportamiento principal y los casos borde listados en las
  specs.
- Los tests no dependen de timers reales para validar polling.
- Los tests no requieren servicios externos reales.
- La cobertura es suficiente para defender la arquitectura y el flujo, sin
  convertir la prueba en una suite e2e pesada.
- `docs/AI_USAGE.md` contiene el checkpoint de tests actualizado.

### 7. Riesgos o tradeoffs

- Si los slices anteriores no agregan sus tests minimos, este slice se convierte
  en una correccion tardia demasiado grande.
- Si se sobrecarga con tests demasiado integrados, la suite puede volverse lenta
  para un test tecnico.
- Tradeoff aceptado: priorizar tests unitarios y de caso de uso, con integracion
  ligera solo donde aporte evidencia real.

### 8. Mensaje de commit sugerido

`test: harden delivery coverage and mappers`

## Slice 8 - Documentacion final de README y AI usage

### 1. Nombre

Documentacion final y guia de prueba local.

### 2. Objetivo

Dejar el proyecto facil de ejecutar, probar y defender, documentando setup local,
comandos, flujos de polling/webhook, decisiones tecnicas, tradeoffs conocidos y
cerrando `docs/AI_USAGE.md` como documento vivo.

### 3. Requisitos que cubre

- README explica setup local.
- README explica como probar polling NRW.
- README explica como probar webhook TLS.
- Codigo simple de explicar y defender.
- Mantener y cerrar `docs/AI_USAGE.md`.
- Mantener explicito el fuera de scope.

### 4. Comportamiento entregado

- README incluye:
  - descripcion breve del microservicio;
  - stack elegido;
  - arquitectura en terminos simples;
  - variables de entorno;
  - como levantar MongoDB local;
  - como instalar dependencias;
  - como ejecutar tests;
  - como levantar la app;
  - ejemplos de `POST /deliveries`;
  - ejemplos reproducibles de provider selection interna:
    `DEMO-NRW-002` para NRW y `DEMO-TLS-001` para TLS;
  - ejemplo de `GET /deliveries/:id/status`;
  - como demostrar polling NRW con una delivery creada desde `DEMO-NRW-002`;
  - como enviar webhook TLS usando una delivery creada desde `DEMO-TLS-001`;
  - errores esperados principales.
- `docs/AI_USAGE.md` queda actualizado con checkpoints de:
  - specs;
  - decisiones tecnicas;
  - implementacion;
  - tests;
  - documentacion.
- La documentacion de AI usage explica que la IA se uso como apoyo para specs,
  tradeoffs, implementacion, tests y documentacion, con decisiones finales y
  validacion a cargo del desarrollador.
- README menciona tradeoffs aceptados:
  - solo ultimo status;
  - polling en proceso;
  - labels mock textuales;
  - sin idempotencia;
  - webhook sin firma;
  - providers mock.

### 5. Tests esperados

- Verificacion manual de comandos documentados:
  - instalar;
  - testear;
  - levantar MongoDB;
  - levantar app;
  - crear delivery;
  - consultar status;
  - probar polling NRW;
  - probar webhook TLS.
- Los ejemplos de request/response del README coinciden con la API real.
- Si se documentan comandos curl, deben funcionar contra la app local.
- Los comandos documentados usan `DEMO-NRW-002` y `DEMO-TLS-001` para obtener
  providers reproducibles sin permitir seleccion manual.

### 6. Criterios de aceptacion

- Una persona nueva puede seguir el README y probar los flujos principales.
- El README no promete features fuera de scope.
- `docs/AI_USAGE.md` existe y contiene checkpoints de specs, decisiones
  tecnicas, implementacion, tests y documentacion.
- README explica como obtener un delivery NRW y un delivery TLS con
  `orderReference` reproducibles sin romper la regla de seleccion interna.
- Los tradeoffs conocidos quedan explicados sin ocultarlos.
- El proyecto queda listo para revision tecnica.

### 7. Riesgos o tradeoffs

- Documentar demasiado puede tapar el flujo principal.
- Documentar poco puede hacer que polling y webhook parezcan incompletos.
- Tradeoff aceptado: README practico, centrado en ejecutar y demostrar la
  solucion, con detalles tecnicos solo donde ayuden a defender decisiones.

### 8. Mensaje de commit sugerido

`docs: add setup guide and AI usage notes`

## Orden recomendado de ejecucion

1. Scaffold minimo del proyecto.
2. Crear delivery y devolver label.
3. Persistir delivery en MongoDB.
4. Consultar ultimo status conocido.
5. Simular polling NRW.
6. Procesar webhook TLS.
7. Hardening de tests, dominio y mappers.
8. Documentacion final de README y AI usage.

Este orden permite que cada paso tenga algo verificable sin partir el trabajo
por capas. La implementacion real debe agregar tests minimos junto a cada slice
funcional. El slice 7 funciona solo como hardening y cierre de cobertura para
asegurar que dominio, casos de uso y mappers quedan defendibles antes de la
documentacion final.
