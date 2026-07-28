# Asignacion de Cabanas

Objetivo: llegar a un plan estable de alojamiento para viernes a domingo (2 noches), priorizando comodidad, logistica y casos criticos.

## Restricciones actuales
- Venue: Roca Azul (Jocotepec, Jalisco)
- Cabanas aseguradas en el venue
- Cobertura estimada: ~80 personas con desayuno
- Invitados de extranjero: prioridad alta de alojamiento

## Priorizacion sugerida
1. Invitados del extranjero
2. Familia nuclear y personas muy cercanas
3. Invitados nacionales que viajan de lejos
4. Invitados locales o con alternativa de hospedaje

## Datos minimos por invitado
- Nombre completo
- Grupo/familia
- Ciudad y pais
- Si viaja de lejos (si/no)
- Si viene del extranjero (si/no)
- Prioridad de alojamiento (alta/media/baja)
- Preferencias o restricciones (adulto mayor, nino, movilidad, etc)

## Flujo de trabajo iterativo
1. Cargar inventario real de cabanas en invitados/cabanas_inventario.csv.
2. Completar datos de invitados en invitados/lista_invitados.csv.
3. Generar propuesta v1 de asignacion.
4. Revisar por bloques familiares con preguntas concretas.
5. Ajustar hasta cerrar capacidad y confort.

## Preguntas iterativas tipo Copilot
- La cabana C1 se reserva para familia Juarez completa?
- David, quieres juntar en la misma cabana a X y Y?
- Esta persona del extranjero requiere cama fija o puede compartir?
- Esta cabana se mantiene mixta o solo familia directa?
- Priorizamos a esta pareja en cabana cercana a ceremonia?

## Criterios de calidad del plan final
- Capacidad usada <= capacidad total en todas las cabanas
- 100% de extranjeros con alojamiento resuelto
- Minimo de conflictos familiares dentro de la misma cabana
- Plan claro de backup para cambios de ultimo minuto

## Propuesta v2 (capacidad funcional 88)
Estado aplicado:
- 73 invitadxs confirmadxs con hospedaje
- 73 asignadxs en propuesta v2
- 15 lugares funcionales de reserva

Movimientos clave:
- Reubicacion de `Christophe Rigollet` de `CABAÑA_4 - 8p` hacia `AZALEA - 12p` para eliminar sobrecupo.
- Asignacion de 41 confirmadxs sin cabana previa en bloques por afinidad:
	- Petanclub + parte de Pintura en `DALIA - 10p`
	- Familia de David en `AZALEA - 12p`
	- Amigos de Ayde en `MARGARITA - 10p`
	- Golden en `CABAÑA_5 - 6p`
	- Resto Pintura + Amigos de Ayde en `CASONA - 18p`

Reserva funcional sugerida (sin asignar en v2):
- `LAVANDA - 4p`: 4
- `CASONA - 18p`: 2
- `HORTENCIA - 2p`: 1
- `CABAÑAS_MADERA_31_2_ADULTOS`: 2
- `CABAÑAS_MADERA_32_2_ADULTOS`: 2
- `CABAÑAS_MADERA_33_2_ADULTOS`: 2
- `CABAÑAS_MADERA_34_2_ADULTOS`: 2

Archivo operativo de acciones:
- `invitados/asignacion_cabanas.csv`
