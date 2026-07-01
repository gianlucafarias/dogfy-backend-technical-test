# Uso de IA

Este documento registra como se uso asistencia de IA durante el proyecto. Es un
documento vivo y debe actualizarse en los checkpoints importantes de specs,
implementacion, tests y documentacion.

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

## Responsabilidad final

Las decisiones finales, la revision del codigo, la validacion local y la defensa
tecnica del proyecto quedan a cargo del desarrollador. Cualquier codigo generado
o revisado con apoyo de IA debe poder explicarse, modificarse y testearse.
