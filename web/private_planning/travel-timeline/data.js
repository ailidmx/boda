export const TRAVEL_TIMELINE_DATA = {
  "generatedFrom": [
    "viajes/grupos_viaje.csv",
    "viajes/grupo_miembros.csv"
  ],
  "weddingDate": "2027-02-20",
  "weddingWeekendStart": "2027-02-19",
  "weddingWeekendEnd": "2027-02-21",
  "groups": [
    {
      "group_id": "G-001",
      "nombre_grupo": "Dimitar + acompañante",
      "fecha_llegada": "2027-02-14",
      "fecha_salida": "2027-02-28",
      "estado_fechas": "partial",
      "estado_asistencia": "confirmed",
      "origen": "Malaga",
      "aeropuerto_llegada": "GDL",
      "total_personas": 2,
      "coordinador": "Dimitar",
      "notas": "Dimitar reservado; falta confirmar si Dimitar +1 comparte el itinerario",
      "members": [
        {
          "group_id": "G-001",
          "guest_id": "211",
          "traveler_id": "V-001",
          "nombre": "Dimitar",
          "rol": "principal",
          "estado_viaje": "booked"
        },
        {
          "group_id": "G-001",
          "guest_id": "212",
          "traveler_id": "",
          "nombre": "Dimitar +1",
          "rol": "acompanante",
          "estado_viaje": "unknown"
        }
      ]
    },
    {
      "group_id": "G-002",
      "nombre_grupo": "Mama Tina",
      "fecha_llegada": "2027-02-10",
      "fecha_salida": "2027-03-15",
      "estado_fechas": "tentative",
      "estado_asistencia": "confirmed",
      "origen": "",
      "aeropuerto_llegada": "",
      "total_personas": 1,
      "coordinador": "Mama Tina",
      "notas": "Asistencia a la boda confirmada; fechas de viaje aun no confirmadas",
      "members": [
        {
          "group_id": "G-002",
          "guest_id": "89",
          "traveler_id": "V-002",
          "nombre": "Mama Tina",
          "rol": "principal",
          "estado_viaje": "tentative"
        }
      ]
    }
  ]
};
