# Product Specification

## 1. Problema

La empresa necesita un microservicio interno de logistica para crear deliveries desde ordenes y consultar su ultimo estado conocido.

El sistema debe ocultar las diferencias entre providers de envio. Para esta primera version solo se integran dos providers mock:

- NRW: simula actualizaciones de status por polling.
- TLS: simula actualizaciones de status por webhook.

El objetivo es cubrir un flujo pequeno, claro y defendible: crear un delivery, seleccionar internamente un provider, generar una label imprimible, guardar el delivery y consultar su status.

## 2. Actores

- Sistema de ordenes: solicita la creacion de deliveries.
- Servicio de logistica: crea, guarda y actualiza deliveries.
- Provider NRW: provider mock que actualiza status mediante polling.
- Provider TLS: provider mock que actualiza status mediante webhook.
- Operaciones internas: consulta el ultimo status conocido de un delivery.

## 3. Casos de uso principales

### Crear delivery desde una orden

El consumidor interno llama a `POST /deliveries` con los datos necesarios de una orden lista para enviarse.

La solicitud debe incluir informacion suficiente para crear el delivery, como:

- referencia de la orden;
- datos del destinatario;
- direccion de entrega;
- informacion basica del paquete.

El sistema valida la solicitud, selecciona un provider soportado y crea el delivery con ese provider.

### Seleccionar provider internamente

El consumidor no selecciona el provider.

El servicio debe seleccionar entre NRW y TLS usando una logica interna simple. Para esta primera version puede ser una seleccion aleatoria o una regla basica definida por el servicio.

La seleccion debe quedar guardada en el delivery para poder saber que provider lo gestiona.

No forma parte del alcance actual optimizar la seleccion por precio, velocidad, disponibilidad o reglas de negocio avanzadas.

### Generar label

Al crear el delivery, el provider mock debe devolver una label imprimible.

El sistema debe devolver esa label en la respuesta de `POST /deliveries` y guardarla junto con el delivery.

Para esta primera version no se contempla que la label quede pendiente, expire o requiera generacion diferida.

### Guardar delivery

Despues de crear el delivery correctamente, el sistema debe guardarlo.

El delivery guardado debe incluir como minimo:

- identificador interno del delivery;
- referencia de la orden;
- provider seleccionado;
- identificador o referencia del provider, si existe;
- label imprimible;
- ultimo status conocido;
- fecha de creacion;
- fecha de ultima actualizacion de status.

El delivery guardado es la fuente que se usa para consultar el ultimo status conocido.

### Consultar ultimo status conocido

El consumidor interno puede consultar el status de un delivery usando:

`GET /deliveries/:id/status`

La respuesta debe devolver el ultimo status conocido guardado por el sistema.

Esta consulta no debe llamar en tiempo real al provider. Solo debe devolver la informacion ya persistida para ese delivery.

### Actualizar status por polling

NRW debe simular actualizaciones por polling.

El sistema debe poder consultar deliveries gestionados por NRW y actualizar su ultimo status conocido cuando el provider mock devuelva un cambio.

Si no hay cambios, el delivery conserva su status actual.

### Actualizar status por webhook

TLS debe simular actualizaciones por webhook.

Cuando el sistema recibe una actualizacion de TLS, debe identificar el delivery correspondiente, traducir el status recibido a un status interno y guardar el nuevo ultimo status conocido.

## 4. Status internos

Para esta primera version, el sistema debe manejar un conjunto pequeno de status normalizados:

- `created`: el delivery fue creado y tiene label.
- `in_transit`: el delivery esta en camino.
- `delivered`: el delivery fue entregado.
- `failed`: el delivery no pudo completarse.

Los providers pueden usar nombres distintos internamente, pero el consumidor del microservicio debe recibir siempre uno de estos status normalizados.

## 5. Comportamientos esperados

- `POST /deliveries` crea un delivery desde una orden.
- El servicio selecciona internamente un provider entre NRW y TLS.
- El provider seleccionado devuelve una label imprimible durante la creacion.
- El sistema guarda el delivery creado.
- La respuesta de creacion incluye el delivery creado, el provider seleccionado, el status inicial y la label.
- `GET /deliveries/:id/status` devuelve el ultimo status conocido guardado.
- NRW actualiza status mediante polling.
- TLS actualiza status mediante webhook.
- El consumidor no necesita conocer los formatos internos de NRW o TLS.
- El consumidor no necesita saber si el status se actualizo por polling o por webhook.

## 6. Casos borde relevantes

- La solicitud de creacion no incluye datos obligatorios.
- No hay providers soportados disponibles para crear el delivery.
- El provider mock falla al crear el delivery.
- El provider mock devuelve un status no reconocido.
- Se consulta el status de un delivery inexistente.
- Se recibe un webhook para un delivery inexistente.
- El polling no devuelve cambios para un delivery.
- El delivery existe, pero todavia no recibio actualizaciones despues de su creacion.

## 7. Criterios de aceptacion

- Se puede crear un delivery con `POST /deliveries` usando datos validos de una orden.
- El consumidor no envia ni elige el provider en la solicitud.
- El sistema selecciona NRW o TLS internamente.
- El delivery queda guardado con su provider seleccionado.
- La respuesta de creacion incluye una label imprimible.
- El delivery creado tiene status inicial `created`.
- Se puede consultar `GET /deliveries/:id/status` y recibir el ultimo status conocido.
- La consulta de status no llama al provider en tiempo real.
- Un delivery gestionado por NRW puede actualizar su status mediante polling.
- Un delivery gestionado por TLS puede actualizar su status mediante webhook.
- Los status de providers se exponen al consumidor como status internos normalizados.
- Los errores principales son simples de entender: datos invalidos, delivery no encontrado o fallo de provider.

## 8. Fuera de scope actual

No entra en esta primera version:

- cancelacion de deliveries;
- seleccion manual de provider por parte del consumidor;
- busqueda de deliveries por referencia de orden;
- generacion diferida de labels;
- labels pendientes, expiradas o regenerables;
- idempotencia de creacion;
- retries avanzados;
- colas avanzadas;
- dashboards;
- billing o conciliacion financiera;
- reclamos o incidencias operativas;
- notificaciones al cliente final;
- tracking en tiempo real;
- comparacion de tarifas;
- optimizacion por coste, velocidad o disponibilidad;
- gestion de devoluciones;
- panel administrativo.

## 9. Mejoras futuras

Mas adelante, si el producto lo necesita, se podria agregar:

- idempotencia para evitar deliveries duplicados por reintentos del consumidor.
- retries controlados ante fallos temporales de providers.
- seleccion avanzada de provider por reglas de negocio.
- labels demoradas o regeneracion de labels.
- busqueda por referencia de orden.
- cancelacion de deliveries.
- dashboards operativos.
- notificaciones al cliente final.
- billing y conciliacion.
- gestion de reclamos o incidencias.
