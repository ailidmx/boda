# Firestore Schema — Boda

> Definición de colecciones, tipos de campos y relaciones entre entidades.
> Versión: 2026-08-03

---

## Convenciones

- **Doc ID**: se especifica por colección.
- **Tipos**: `string`, `number`, `boolean`, `Timestamp`, `Reference`, `Array`, `Map`.
- **Campos opcionales**: marcados con `?`.
- **Moneda**: todos los precios en MXN (pesos mexicanos). Conversión a EUR se hace en capa de presentación.
- **Idioma de campos**: TODOS los nombres de campo en Firestore son en inglés (camelCase). NO se usan nombres en español (ej. `invitacionGroup`, `celular`, `capacidad`, `ocupacion`). Usar `invitationGroup`, `phone`, `capacity`, `occupancy`.
- **Schema estricto**: las reglas de Firestore (`firebase/firestore.rules`) usan `hasOnly(...)` para rechazar cualquier campo no acordado. El frontend NO puede crear campos nuevos; debe ceñirse a este schema.
- **Migración**: para renombrar campos legacy (`invitacionGroup` → `invitationGroup`, `celular` → `phone`, `capacidad` → `capacity`, etc.) ejecutar `web/invitation/scripts/rename-fields.mjs` (hace backup y merge, no pierde datos).

---

## 1. `guests/{id}`

Doc ID = ID único del invitado (e.g. `"david_aïli"`, `"mónica_quezada_rangel"`).

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string` | ID único del invitado (doc ID) |
| `identity` | `map` | Datos de identidad del invitado |
| `identity.firstName` | `string` | Nombre |
| `identity.middleName` | `string` | Nombre 2 (opcional) |
| `identity.lastName` | `string` | Apellido |
| `identity.maternalLastName` | `string` | Apellido materno / Apellido 2 (canónico, opcional) |
| `identity.gender` | `string` | Género / tratamiento del invitado (opcional) |
| `identity.cloudinaryId` | `string` | ID de foto en Cloudinary (opcional) |
| `identity.lang` | `string` | Idioma preferido: `"es"`, `"fr"`, `"en"` |
| `identity.age` | `string` | Edad (opcional) |
| `identity.phone` | `string` | Teléfono / WhatsApp |
| `idCheckUser` | `boolean` | Si el usuario verificó su identidad |
| `gender` | `string` | Copia de compatibilidad; usar `identity.gender` como campo canónico |
| `cloudinaryId` | `string` | Copia de compatibilidad; usar `identity.cloudinaryId` como campo canónico |
| `message` | `string` | Mensaje personalizado (opcional) |
| `messageAuthor` | `string` | Autor del mensaje (opcional) |
| `invitationGroup` | `string` | Grupo de invitación (e.g. `"David y Aydé"`, `"Familia Rako"`) |
| `tagGroup` | `string` | Grupo de etiqueta (e.g. `"PetanclubGDL"`, `"Novios"`) |
| `hosting` | `map` | Datos de hospedaje del invitado |
| `hosting.cabin` | `string` | Nombre de la cabaña asignada (opcional) |
| `hosting.room` | `string` | ID de la habitación asignada (opcional) |
| `hosting.xtraCabin` | `string` | Cabaña extra (opcional) |
| `hosting.xtraRoom` | `string` | Habitación extra (opcional) |
| `hosting.isCabinPaidByNovios` | `boolean` | Cabaña pagada por los novios |
| `hosting.isCabinPaid` | `boolean` | Cabaña pagada |
| `hosting.isXtraCabinPaidByNovios` | `boolean` | Cabaña extra pagada por los novios |
| `hosting.isXtraCabinPaid` | `boolean` | Cabaña extra pagada |
| `table` | `string` | Mesa asignada (opcional) |
| `sent` | `boolean` | Si se envió la invitación |
| `rsvp` | `map` | Objeto anidado con confirmaciones RSVP |
| `rsvp.friday` | `boolean` | Confirmó asistencia viernes |
| `rsvp.saturday` | `boolean` | Confirmó asistencia sábado |
| `rsvp.sunday` | `boolean` | Confirmó asistencia domingo |
| `rsvp.confirmCabin` | `boolean` | Confirmó cabaña |
| `rsvp.cabinWaitingList` | `boolean` | En lista de espera de cabaña |
| `rsvp.xtra` | `boolean` | Confirmó cabaña extra |
| `rsvp.playa` | `boolean` | Confirmó playa |
| `rsvp.petanca` | `boolean` | Confirmó petanca |
| `rsvp.needBalls` | `boolean` | Necesita bolas de petanca |
| `modifiedAt` | `string` | Fecha de última modificación |
| `travelsByPlane` | `boolean` | Viaja en avión |

| `isAdmin` | `boolean` | Es administrador |
| `_source` | `string` | Fuente de datos (e.g. `"google_sheet"`) |
| `_migratedAt` | `string` | Fecha de migración (ISO) |

**Reglas:** Los invitados pueden actualizar sus propios campos RSVP y contacto. La pareja puede actualizar todo. El schema se valida con `hasValidGuestFields()` en `firebase/firestore.rules`.

---

## 2. `rooms/{roomId}`

Doc ID = ID único de la habitación (e.g. `"VILLA MARGARITA-1"`, `"CASONA-3"`).

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string` | ID único de la habitación (doc ID) |
| `cabin` | `string` | Nombre de la cabaña (e.g. `"VILLA MARGARITA"`) |
| `description` | `map` | Descripciones localizadas `{ es, fr, en }` |
| `capacity` | `number` | Capacidad máxima de personas |
| `isShared` | `boolean` | Si la habitación es compartida entre grupos |
| `_source` | `string` | Fuente de datos (e.g. `"cuartos.csv"`) |
| `_migratedAt` | `string` | Fecha de migración (ISO) |

**Uso:** La colección `rooms` es la fuente de verdad para el inventario de habitaciones. Se carga al inicio con `loadRooms()` tanto en la invitación como en el dashboard. La ocupación se calcula en tiempo de ejecución contando los invitados asignados a cada habitación (campo `room` en `guests`).

**Reglas:** Solo la pareja puede escribir; todos pueden leer. El schema se valida con `hasValidRoomFields()` en `firebase/firestore.rules`.

---

## 3. `cabins/{id}`

Doc ID = código estable de la cabaña (e.g. `"VILLA AZALEA"`, `"CABAÑA 1"`).

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string` | ID único de la cabaña (doc ID) |
| `name` | `string` | Nombre público con capacidad (e.g. `"CABAÑA MADERA - 2p"`) |
| `capacity` | `number` | Capacidad nominal |
| `capacityRoomCheck` | `number` | Capacidad de verificación por habitación |
| `totalPrice2Nights` | `number` | Precio total por 2 noches (MXN) |
| `pricePerPerson2Nights` | `number` | Precio por persona 2 noches (MXN) |
| `pricePerPersonPerNight` | `number` | Precio por persona por noche (MXN) |
| `isPrivate` | `boolean` | Si es privada |
| `isBooked` | `boolean` | Si está reservada |
| `isBookedXtra` | `boolean` | Si está reservada como extra |
| `isPaid` | `boolean` | Si está pagada |
| `isPaidXtra` | `boolean` | Si está pagada como extra |
| `_source` | `string` | Fuente de datos (e.g. `"cabanas_inventario.csv"`) |
| `_migratedAt` | `string` | Fecha de migración (ISO) |

**Ocupación:** `occupancy` y `occupancyPct` no se almacenan. Ambos valores se calculan a partir de las asignaciones de habitación de la colección `guests` y de la capacidad de `rooms`.

**Uso:** La colección `cabins` proporciona el nombre público de la cabaña y sus datos de reserva. La colección `rooms` sigue siendo la fuente de verdad para el detalle de las habitaciones.

---

## 4. `budget/{autoId}`

Doc ID = ID auto-generado por Firestore.

| Campo | Tipo | Descripción |
|---|---|---|
| `item` | `string` | Concepto (e.g. `"Anillo de compromiso"`) |
| `totalMxn` | `number` | Total en MXN |
| `approxMxn` | `number` | Aproximado en MXN |
| `paidMxn` | `number` | Monto pagado en MXN |
| `paidDate` | `string` | Fecha de pago |
| `paidBy` | `string` | Pagado por: `"David"`, `"Aydé"` |
| `davidPct` | `number` | Porcentaje pagado por David (0–100) |
| `aydePct` | `number` | Porcentaje pagado por Aydé (0–100) |
| `davidAmount` | `number` | Monto pagado por David (MXN) |
| `aydeAmount` | `number` | Monto pagado por Aydé (MXN) |
| `confirmedCount` | `number` | Conteo confirmado |
| `estimatedCount` | `number` | Conteo estimado |

---

## 5. `thanks/{autoId}`

Doc ID = ID auto-generado por Firestore.

| Campo | Tipo | Descripción |
|---|---|---|
| `guest` | `string` | ID del invitado |
| `es` | `string` | Mensaje de agradecimiento en español |
| `fr` | `string` | Mensaje de agradecimiento en francés |
| `en` | `string` | Mensaje de agradecimiento en inglés |
| `_source` | `string` | Fuente de datos |
| `_migratedAt` | `string` | Fecha de migración (ISO) |

---

## 6. `attendance_responses/{guestId}`

Doc ID = ID del invitado (mismo que `guests/{id}`).

| Campo | Tipo | Descripción |
|---|---|---|
| `guestId` | `string` | ID del invitado |
| `friday` | `string` | Asistencia viernes: `"yes"`, `"no"`, `"maybe"`, `""` |
| `saturday` | `string` | Asistencia sábado: `"yes"`, `"no"`, `"maybe"`, `""` |
| `sunday` | `string` | Asistencia domingo: `"yes"`, `"no"`, `"maybe"`, `""` |
| `invitationGroup` | `string` | Grupo de invitación |
| `updatedBy` | `string` | ID del invitado que editó |
| `language` | `string` | Idioma: `"es"`, `"fr"`, `"en"` |
| `schemaVersion` | `number` | Versión del schema (`1`) |
| `updatedAt` | `Timestamp` | Fecha de última actualización |

**Reglas:** Cualquier invitado autenticado puede crear/actualizar la respuesta de asistencia de sí mismo o de miembros de su grupo de invitación. El schema se valida con `hasValidAttendanceFields()` en `firebase/firestore.rules`.

---

## 7. `rsvp_submissions/{submissionId}`

Doc ID = ID auto-generado por Firestore.

| Campo | Tipo | Descripción |
|---|---|---|
| `firstName` | `string` | Nombre |
| `lastName` | `string` | Apellido |
| `email` | `string` | Correo electrónico |
| `whatsapp` | `string` | WhatsApp |
| `attendance` | `string` | Asistencia |
| `groupMode` | `string` | Modo de grupo |
| `groupName` | `string` | Nombre del grupo |
| `partySize` | `string` | Tamaño del grupo |
| `adults` | `string` | Adultos |
| `children` | `string` | Niños |
| `guests` | `string` | Invitados |
| `accommodation` | `string` | Alojamiento |
| `travelStatus` | `string` | Estado de viaje |
| `arrivalFrom` | `string` | Origen de llegada |
| `arrivalTo` | `string` | Destino de llegada |
| `arrivalDate` | `string` | Fecha de llegada |
| `arrivalTime` | `string` | Hora de llegada |
| `arrivalAirline` | `string` | Aerolínea de llegada |
| `arrivalFlight` | `string` | Vuelo de llegada |
| `departureFrom` | `string` | Origen de salida |
| `departureTo` | `string` | Destino de salida |
| `departureDate` | `string` | Fecha de salida |
| `departureTime` | `string` | Hora de salida |
| `departureAirline` | `string` | Aerolínea de salida |
| `departureFlight` | `string` | Vuelo de salida |
| `route` | `string` | Ruta |
| `notes` | `string` | Notas |
| `invitationCode` | `string` | Código de invitación |
| `language` | `string` | Idioma: `"es"`, `"fr"`, `"en"` |
| `schemaVersion` | `number` | Versión del schema (`3`) |
| `createdAt` | `Timestamp` | Fecha de creación |

**Reglas:** Solo invitados autenticados pueden crear. El schema se valida con `hasValidRsvpFields()` en `firebase/firestore.rules`.

---

## 8. `experience_suggestions/{submissionId}`

Doc ID = ID auto-generado por Firestore.

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | `string` | Nombre |
| `dessert` | `string` | Postre |
| `foodSuggestion` | `string` | Sugerencia de comida |
| `songTitle` | `string` | Título de canción |
| `songArtist` | `string` | Artista |
| `singInterest` | `string` | Interés en cantar |
| `extra` | `string` | Extra |
| `invitationCode` | `string` | Código de invitación |
| `language` | `string` | Idioma: `"es"`, `"fr"`, `"en"` |
| `schemaVersion` | `number` | Versión del schema (`1`) |
| `createdAt` | `Timestamp` | Fecha de creación |

**Reglas:** Solo invitados autenticados pueden crear. El schema se valida con `hasOnly` en `firebase/firestore.rules`.

---

## 9. `coast_interest/{submissionId}`

Doc ID = ID auto-generado por Firestore.

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | `string` | Nombre |
| `interest` | `string` | Interés |
| `partySize` | `string` | Tamaño del grupo |
| `nights` | `string` | Noches |
| `destination` | `string` | Destino |
| `style` | `string` | Estilo |
| `note` | `string` | Nota |
| `invitationCode` | `string` | Código de invitación |
| `language` | `string` | Idioma: `"es"`, `"fr"`, `"en"` |
| `schemaVersion` | `number` | Versión del schema (`1`) |
| `createdAt` | `Timestamp` | Fecha de creación |

**Reglas:** Solo invitados autenticados pueden crear. El schema se valida con `hasOnly` en `firebase/firestore.rules`.

---

## 10. `petanque_participation/{submissionId}`

Doc ID = ID auto-generado por Firestore.

| Campo | Tipo | Descripción |
|---|---|---|
| `petanqueParticipation` | `string` | Participación en petanca |
| `petanquePartySize` | `string` | Tamaño del grupo de petanca |
| `petanqueNames` | `string` | Nombres de participantes |
| `petanqueOwnBoules` | `string` | Trae sus propias bolas |
| `invitationCode` | `string` | Código de invitación |
| `language` | `string` | Idioma: `"es"`, `"fr"`, `"en"` |
| `schemaVersion` | `number` | Versión del schema (`1`) |
| `createdAt` | `Timestamp` | Fecha de creación |

**Reglas:** Solo invitados autenticados pueden crear. El schema se valida con `hasOnly` en `firebase/firestore.rules`.


---

## Colecciones eliminadas

Las siguientes colecciones fueron eliminadas en la migración de 2026-08-02 y ya no existen:

- `guest_auth`
- `guest_profiles`
- `guest_groups`

- `assignments`
- `flights`
- `stays`
- `transfers`
- `travel_groups`
- `travelers`
- `group_members`

---

## Diagrama de relaciones

```
guests ──invitationGroup──→ (agrupación lógica, no colección)
  │
  ├──room──→ rooms
  │
  ├──cabin──→ cabins (legacy)
  │
  └──table──→ (mesa, no colección)

rooms ──cabin──→ cabins (legacy)
```

---

## Notas

- **Currency**: Todos los precios están en MXN. La conversión a EUR se hará en la capa de presentación (frontend) con un módulo de conversión.
- **Occupancy**: Se calcula como número de guests con ese `room` o `cabin`, no se almacena manualmente.
- **Schema estricto**: Las reglas de Firestore usan `hasOnly(...)` para rechazar campos no acordados. El frontend NO puede crear campos nuevos.
- **Migración**: Para renombrar campos legacy ejecutar `web/invitation/scripts/rename-fields.mjs`.
