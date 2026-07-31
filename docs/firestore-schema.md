# Firestore Schema — Boda

> Definición de colecciones, tipos de campos y relaciones entre entidades.
> Versión: 2026-07-29

---

## Convenciones

- **Doc ID**: se especifica por colección.
- **Tipos**: `string`, `number`, `boolean`, `Timestamp`, `Reference`, `Array`, `Map`.
- **Referencias**: se indican como `Reference<collection>`.
- **Campos opcionales**: marcados con `?`.
- **Moneda**: todos los precios en MXN (pesos mexicanos). Conversión a EUR se hace en capa de presentación.

---

## 1. `guests/{row}`

Doc ID = número de fila del CSV (1-based).

| Campo | Tipo | Descripción |
|---|---|---|
| `row` | `number` | Número de fila en CSV (1-based) |
| `firstName` | `string` | Nombre |
| `lastName` | `string` | Apellido |
| `email` | `string` | Correo electrónico |
| `groupId` | `string` | Referencia a `guest_groups/{name}` |
| `cabinId` | `string` o `null` | Referencia a `cabins/{code}`. `null` si no tiene cabaña |
| `isChild` | `boolean` | `true` si es Niño, `false` si Adulto |
| `gender` | `string` | `"H"` o `"M"` |
| `invitationSent` | `boolean` | Si se envió invitación |
| `confirmed` | `boolean` | Si confirmó asistencia |
| `confirmedDate` | `string` o `null` | Fecha de confirmación (formato ISO) |

**Relaciones:**
- `groupId` → `guest_groups/{name}`
- `cabinId` → `cabins/{code}`

---

## 2. `guest_groups/{name}`

Doc ID = nombre del grupo (e.g. `"PetanclubGDL"`, `"Novios"`, `"Familia de David"`).

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | `string` | Nombre interno del grupo (doc ID) |
| `label` | `string` | Etiqueta visible (idioma neutro) |
| `labelEn` | `string` | Etiqueta en inglés |
| `labelFr` | `string` | Etiqueta en francés |
| `memberCount` | `number` | Número de miembros (calculado) |

**Grupos conocidos:**
- `Novios`
- `PetanclubGDL`
- `Amigos de David`
- `Amigos de Aydé`
- `Familia de David`
- `Familia de Aydé`
- `Golden`
- `Pintura`
- `38 Tonnes`

---

## 3. `cabins/{code}`

Doc ID = código de cabaña (e.g. `"AZALEA"`, `"DALIA"`, `"CABAÑA_31"`).

| Campo | Tipo | Descripción |
|---|---|---|
| `code` | `string` | Código único de cabaña (doc ID) |
| `name` | `string` | Nombre completo (e.g. `"AZALEA - 12p"`) |
| `capacity` | `number` | Capacidad nominal |
| `occupancy` | `number` | Ocupación actual (personas asignadas) |
| `occupancyPct` | `number` | Porcentaje de ocupación (0–100) |
| `totalPrice2Nights` | `number` | Precio total por 2 noches (MXN) |
| `pricePerPerson2Nights` | `number` | Precio por persona 2 noches (MXN) |
| `pricePerPersonPerNight` | `number` | Precio por persona por noche (MXN) |
| `tags` | `array<string>` | Etiquetas (e.g. `["Petanca", "Novios"]`) |
| `selected` | `boolean` | Si está seleccionada en el plan |

**Códigos conocidos:**
- `AZALEA`, `DALIA`, `MARGARITA`, `LAVANDA`, `HORTENCIA`
- `CABAÑA_31`, `CABAÑA_32`, `CABAÑA_33`, `CABAÑA_34`
- `CABAÑA_6`, `CABAÑA_5`, `CABAÑA_4`
- `CASONA`

---

## 4. `assignments/{id}`

Doc ID = número de fila del CSV de asignación (propuesta_v2).

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `number` | ID de la asignación |
| `guestName` | `string` | Nombre completo del invitado |
| `group` | `string` | Grupo del invitado |
| `cabinId` | `string` | Referencia a `cabins/{code}` |
| `priority` | `string` | Prioridad: `"alta"`, `"media"`, `"baja"` |
| `status` | `string` | Estado: `"propuesta_v2"`, `"propuesta_v2_reubicar"` |
| `notes` | `string` | Notas operativas |

---

## 5. `travel_groups/{groupId}`

Doc ID = ID del grupo de viaje (e.g. `"G-001"`, `"G-002"`).

| Campo | Tipo | Descripción |
|---|---|---|
| `groupId` | `string` | ID del grupo (doc ID) |
| `name` | `string` | Nombre del grupo (e.g. `"Dimitar + acompañante"`) |
| `arrivalDate` | `string` | Fecha de llegada (ISO) |
| `departureDate` | `string` | Fecha de salida (ISO) |
| `dateStatus` | `string` | Estado de fechas: `"partial"`, `"tentative"`, `"confirmed"` |
| `attendanceStatus` | `string` | Estado de asistencia: `"confirmed"` |
| `origin` | `string` | Ciudad/país de origen |
| `airport` | `string` | Aeropuerto de llegada (e.g. `"GDL"`) |
| `totalPeople` | `number` | Total de personas en el grupo |
| `coordinator` | `string` | Nombre del coordinador |
| `notes` | `string` | Notas |

---

## 6. `group_members/{autoId}`

Doc ID = ID auto-generado por Firestore.

| Campo | Tipo | Descripción |
|---|---|---|
| `groupId` | `string` | Referencia a `travel_groups/{groupId}` |
| `guestId` | `number` | Referencia a `guests/{row}` |
| `travelerId` | `string` o `null` | Referencia a `travelers/{travelerId}` |
| `name` | `string` | Nombre del miembro |
| `role` | `string` | Rol: `"principal"`, `"acompanante"` |
| `travelStatus` | `string` | Estado: `"booked"`, `"unknown"`, `"tentative"` |

---

## 7. `travelers/{travelerId}`

Doc ID = ID del viajero (e.g. `"V-001"`, `"V-002"`).

| Campo | Tipo | Descripción |
|---|---|---|
| `travelerId` | `string` | ID del viajero (doc ID) |
| `travelGroupId` | `string` | Referencia a `travel_groups/{groupId}` |
| `guestId` | `number` | Referencia a `guests/{row}` |
| `name` | `string` | Nombre del viajero |
| `originCity` | `string` | Ciudad de origen |
| `originCountry` | `string` | País de origen |
| `tripStart` | `string` | Fecha inicio del viaje (ISO) |
| `tripEnd` | `string` | Fecha fin del viaje (ISO) |
| `arrivalAirport` | `string` | Aeropuerto de llegada |
| `flightStatus` | `string` | Estado de vuelos |
| `stayStatus` | `string` | Estado de estancias |
| `transferStatus` | `string` | Estado de traslados |
| `notes` | `string` | Notas |

---

## 8. `flights/{autoId}`

Doc ID = ID auto-generado por Firestore.

| Campo | Tipo | Descripción |
|---|---|---|
| `travelerId` | `string` | Referencia a `travelers/{travelerId}` |
| `segment` | `number` | Número de segmento (1, 2, 3…) |
| `direction` | `string` | Dirección: `"ida"`, `"vuelta"` |
| `status` | `string` | Estado del vuelo |
| `date` | `string` | Fecha del vuelo (ISO) |
| `origin` | `string` | Código aeropuerto origen (e.g. `"AGP"`) |
| `destination` | `string` | Código aeropuerto destino (e.g. `"MAD"`) |
| `airline` | `string` | Aerolínea |
| `flightNumber` | `string` | Número de vuelo |
| `departureLocal` | `string` | Hora de salida local (HH:mm) |
| `arrivalDate` | `string` | Fecha de llegada (ISO) |
| `arrivalLocal` | `string` | Hora de llegada local (HH:mm) |
| `terminalDeparture` | `string` | Terminal de salida |
| `terminalArrival` | `string` | Terminal de llegada |
| `sourceUrl` | `string` | URL de fuente del horario |
| `verifiedDate` | `string` | Fecha de verificación (ISO) |
| `notes` | `string` | Notas |

---

## 9. `stays/{autoId}`

Doc ID = ID auto-generado por Firestore.

| Campo | Tipo | Descripción |
|---|---|---|
| `travelerId` | `string` | Referencia a `travelers/{travelerId}` |
| `block` | `number` | Bloque de estancia (1, 2, 3…) |
| `checkIn` | `string` | Fecha de check-in (ISO) |
| `checkOut` | `string` | Fecha de check-out (ISO) |
| `city` | `string` | Ciudad |
| `place` | `string` | Lugar / nombre del alojamiento |
| `address` | `string` | Dirección |
| `status` | `string` | Estado: `"pending"`, `"confirmed"`, `"tentative_pending"` |
| `contact` | `string` | Contacto |
| `notes` | `string` | Notas |

---

## 10. `transfers/{transferId}`

Doc ID = ID del traslado (e.g. `"TR-001"`, `"TR-002"`).

| Campo | Tipo | Descripción |
|---|---|---|
| `transferId` | `string` | ID del traslado (doc ID) |
| `travelerId` | `string` | Referencia a `travelers/{travelerId}` |
| `type` | `string` | Tipo: `"recogida_llegada"`, `"regreso_aeropuerto"` |
| `date` | `string` | Fecha (ISO) |
| `airport` | `string` | Aeropuerto |
| `flightRef` | `string` | Referencia del vuelo |
| `flightTime` | `string` | Hora del vuelo |
| `airportTargetTime` | `string` | Hora objetivo en aeropuerto |
| `pickupSuggestedTime` | `string` | Hora sugerida de recogida |
| `origin` | `string` | Origen |
| `destination` | `string` | Destino |
| `responsible` | `string` | Responsable |
| `vehicle` | `string` | Vehículo |
| `status` | `string` | Estado: `"planning"`, `"blocked"`, `"confirmed"` |
| `notes` | `string` | Notas |

---

## 11. `invitation_groups/{groupId}`

Doc ID = nombre del grupo (e.g. `"Familia de David"`, `"PetanclubGDL"`).

| Campo | Tipo | Descripción |
|---|---|---|
| `customContent.greeting` | `string` | Saludo personalizado (HTML) que aparece arriba del perfil |
| `customContent.message` | `string` | Mensaje personalizado (HTML) dentro de la tarjeta de perfil |
| `customContent.section` | `string` | Sección extra (HTML) que se renderiza después del perfil |
| `customContent.hideSections` | `array<string>` | IDs de secciones a ocultar (ej: `["schedule", "gift"]`) |

**Uso:** El contenido se carga al inicio con `loadGroupCustomContent()` y se mergea con el contenido por invitado (el contenido del invitado sobrescribe al del grupo).

---

## 12. `budget/{autoId}`

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

## Diagrama de relaciones

```
guests ──groupId──→ guest_groups
  │
  └──cabinId──→ cabins
  │
  └──guestId──→ group_members ──groupId──→ travel_groups
                  │
                  └──travelerId──→ travelers ──travelGroupId──→ travel_groups
                                     │
                                     ├──→ flights
                                     ├──→ stays
                                     └──→ transfers

assignments ──cabinId──→ cabins
```

---

## Notas

- **Currency**: Todos los precios están en MXN. La conversión a EUR se hará en la capa de presentación (frontend) con un módulo de conversión.
- **Cabin codes**: Son los códigos cortos (e.g. `"AZALEA"`, `"CABAÑA_31"`) — NO el nombre completo del CSV (e.g. `"AZALEA - 12p"`).
- **Invitation codes**: Se derivan en tiempo de lectura desde `guests.cabinId` + datos del guest. No se almacenan directamente.
- **Occupancy**: Se calcula como número de guests con ese `cabinId`, no se almacena manualmente.
