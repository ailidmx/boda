# Viajes de invitados / Voyages des invites

Modulo operativo para acompanar a quienes vienen de lejos desde la compra del vuelo hasta su regreso al aeropuerto.

## Objetivos

- Mantener una ficha de viaje por invitado, separada de la lista maestra de invitados.
- Registrar cada tramo aereo con fecha, numero de vuelo y horario local.
- Detectar huecos de alojamiento antes y despues del fin de semana de la boda.
- Planear recogidas y regresos al aeropuerto con responsables y margenes.
- Agrupar llegadas compatibles para compartir traslados.

## Archivos

- `viajeros.csv`: resumen del viaje por persona.
- `vuelos.csv`: un registro por tramo aereo.
- `estancias.csv`: alojamiento noche por noche o por bloques.
- `traslados.csv`: recogidas y regresos al aeropuerto.
- `rutas_europa_gdl_pvr.md`: conexiones sin escala utiles desde Europa.
- `fichas/`: resumen legible y decisiones pendientes de cada viajero.

## Flujo por invitado

1. Identificar el `guest_id` de `invitados/lista_invitados.csv`.
2. Registrar fechas generales y ciudad de origen en `viajeros.csv`.
3. Cargar todos los tramos del billete en `vuelos.csv`.
4. Cargar la estancia completa en `estancias.csv`, incluyendo noches fuera de Roca Azul.
5. Crear los dos movimientos principales en `traslados.csv`: llegada y regreso.
6. Revisar cambios de horario 30 dias, 7 dias, 72 horas y 24 horas antes de cada vuelo.

## Regla de privacidad

No guardar aqui pasaporte, fecha de nacimiento, numero de boleto, localizador de reserva (PNR) ni capturas completas del billete. Esos datos deben permanecer en un canal privado. Para la operacion solo necesitamos nombre, ruta, vuelos, horarios, equipaje, contacto y necesidades de movilidad.

## FR - Principe

Chaque invite venant de loin aura une fiche reliee a ses vols, ses hebergements et ses transferts. Les donnees sensibles comme le passeport, le numero de billet ou le code de reservation ne doivent pas etre enregistrees dans le depot.
