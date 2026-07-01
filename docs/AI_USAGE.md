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

## Responsabilidad final

Las decisiones finales, la revision del codigo, la validacion local y la defensa
tecnica del proyecto quedan a cargo del desarrollador. Cualquier codigo generado
o revisado con apoyo de IA debe poder explicarse, modificarse y testearse.
