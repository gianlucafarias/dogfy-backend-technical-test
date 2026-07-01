Estoy construyendo un microservicio backend interno de logística.

Restricciones no negociables:
- Node.js + TypeScript.
- No usar Nest.js.
- Arquitectura hexagonal.
- DDD pragmático.
- Base de datos no relacional/documental.
- Providers: NRW y TLS.
- Cada provider debe estar detrás de una interfaz común.
- POST /deliveries debe crear una delivery, seleccionar provider, generar label y devolverla.
- GET /deliveries/:id/status debe devolver el último estado conocido desde la base de datos.
- NRW debe simular actualizaciones por polling.
- TLS debe simular actualizaciones por webhook.
- Debe haber unit tests de lógica core.
- README debe explicar setup local y cómo probar polling/webhook.
- El código debe ser simple de explicar, modificar y defender.

Reglas de trabajo:
- No escribas código si la spec no está clara.
- No agregues features fuera de scope.
- No tomes decisiones finales: propone opciones, recomienda una y espera mi confirmación.
- Si falta información, pregunta antes de inventar.
- Cada propuesta debe indicar qué requisito cubre.
- Cada cambio debe ser pequeño y verificable.