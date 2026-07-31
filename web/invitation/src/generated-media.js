/**
 * GENERATED FILE — do not edit by hand.
 *
 * Produced by scripts/generate-media-manifest.mjs from Cloudinary tags and the
 * cabin database (invitados/cabanas/*.json). Re-run that script after tagging
 * new photos or updating cabin data.
 *
 *   node scripts/generate-media-manifest.mjs
 */

// Cabin photo public_ids, keyed by the invitation's cabin key. The order is
// alphabetical by public_id (Cloudinary tag order).
export const CABIN_PHOTOS = {
  "azalea": [
    "cabin-azalea-01",
    "cabin-azalea-02",
    "cabin-azalea-03",
    "cabin-azalea-04",
    "cabin-azalea-05",
    "cabin-azalea-06",
    "cabin-azalea-07",
    "cabin-azalea-08",
    "cabin-azalea-09"
  ],
  "dalia": [
    "cabin-dalia-01",
    "cabin-dalia-02",
    "cabin-dalia-03",
    "cabin-dalia-04",
    "cabin-dalia-05",
    "cabin-dalia-06",
    "cabin-dalia-07"
  ],
  "margarita": [
    "cabin-margarita-01",
    "cabin-margarita-02",
    "cabin-margarita-03",
    "cabin-margarita-04",
    "cabin-margarita-05",
    "cabin-margarita-06",
    "cabin-margarita-07",
    "cabin-margarita-08"
  ],
  "wooden": [
    "cabin-wooden-01",
    "cabin-wooden-02",
    "cabin-wooden-03",
    "cabin-wooden-04"
  ]
};

// Cabin tour video public_ids (one per cabin, if present).
export const CABIN_VIDEOS = {
  "wooden": "cabin-wooden-tour"
};

// Cabin metadata straight from the database (invitados/cabanas/*.json).
export const CABIN_DB = {
  "azalea": {
    "id": "azalea",
    "nombre": "Azalea",
    "venue": "Club Roca Azul",
    "capacidad_anunciada": 12,
    "habitaciones": 3,
    "camas": {
      "matrimoniales": 4,
      "individuales": 3,
      "total_fisico": 7,
      "couchages_descritos": 11
    },
    "distribucion": [
      {
        "habitacion": 1,
        "camas_matrimoniales": 2,
        "camas_individuales": 0
      },
      {
        "habitacion": 2,
        "camas_matrimoniales": 2,
        "camas_individuales": 0
      },
      {
        "habitacion": 3,
        "camas_matrimoniales": 0,
        "camas_individuales": 3
      }
    ],
    "espacios_observados_en_fotos": [
      "sala",
      "comedor",
      "cocina",
      "barra",
      "baño con ducha"
    ],
    "fotos": [
      "CAB-AZA-01",
      "CAB-AZA-02",
      "CAB-AZA-03",
      "CAB-AZA-04",
      "CAB-AZA-05",
      "CAB-AZA-06",
      "CAB-AZA-07",
      "CAB-AZA-08",
      "CAB-AZA-09"
    ],
    "estado": "confirmacion_parcial",
    "pendiente": [
      "Confirmar con el venue dónde duerme la persona 12 o si existe un couchage adicional no descrito."
    ],
    "fuente": {
      "tipo": "mensaje_y_fotos_del_venue",
      "fecha_material": "2026-02-18",
      "registrado": "2026-07-29"
    }
  },
  "dalia": {
    "id": "dalia",
    "nombre": "Dalia",
    "venue": "Club Roca Azul",
    "capacidad_anunciada": 10,
    "habitaciones": 3,
    "camas": {
      "matrimoniales": 3,
      "individuales": 4,
      "total_fisico": 7,
      "couchages_descritos": 10
    },
    "distribucion": [
      {
        "habitacion": 1,
        "camas_matrimoniales": 2,
        "camas_individuales": 0
      },
      {
        "habitacion": 2,
        "camas_matrimoniales": 0,
        "camas_individuales": 4,
        "configuracion": "2 literas"
      },
      {
        "habitacion": 3,
        "camas_matrimoniales": 1,
        "camas_individuales": 0
      }
    ],
    "espacios_observados_en_fotos": [
      "sala",
      "comedor",
      "baño con ducha",
      "vista hacia la alberca"
    ],
    "precio": {
      "total_2_noches_mxn": 11150,
      "incluye_desayunos": true,
      "uso": "interno_hasta_confirmacion_final"
    },
    "fotos": [
      "CAB-DAL-01",
      "CAB-DAL-02",
      "CAB-DAL-03",
      "CAB-DAL-04",
      "CAB-DAL-05",
      "CAB-DAL-06",
      "CAB-DAL-07"
    ],
    "estado": "confirmado",
    "pendiente": [],
    "fuente": {
      "tipo": "mensaje_y_fotos_del_venue",
      "fecha_material": "2026-02-18",
      "registrado": "2026-07-29"
    }
  },
  "margarita": {
    "id": "margarita",
    "nombre": "Margarita",
    "venue": "Club Roca Azul",
    "capacidad_anunciada": 10,
    "habitaciones": 3,
    "camas": {
      "matrimoniales": 3,
      "individuales": 4,
      "total_fisico": 7,
      "couchages_descritos": 10
    },
    "distribucion": [
      {
        "habitacion": 1,
        "camas_matrimoniales": 2,
        "camas_individuales": 0
      },
      {
        "habitacion": 2,
        "camas_matrimoniales": 0,
        "camas_individuales": 4,
        "configuracion": "2 literas"
      },
      {
        "habitacion": 3,
        "camas_matrimoniales": 1,
        "camas_individuales": 0
      }
    ],
    "espacios_observados_en_fotos": [
      "sala",
      "comedor",
      "cocina con barra",
      "baño con ducha",
      "jardín y fogatero exterior"
    ],
    "precio": {
      "total_2_noches_mxn": 11150,
      "incluye_desayunos": true,
      "uso": "interno_hasta_confirmacion_final"
    },
    "fotos": [
      "CAB-MAR-01",
      "CAB-MAR-02",
      "CAB-MAR-03",
      "CAB-MAR-04",
      "CAB-MAR-05",
      "CAB-MAR-06",
      "CAB-MAR-07",
      "CAB-MAR-08"
    ],
    "estado": "confirmado",
    "pendiente": [],
    "fuente": {
      "tipo": "mensaje_y_fotos_del_venue",
      "fecha_material": "2026-02-18",
      "registrado": "2026-07-29"
    }
  },
  "wooden": {
    "id": "madera-31-34",
    "nombre": "Cabañas de madera 31–34",
    "venue": "Club Roca Azul",
    "unidades": [
      31,
      32,
      33,
      34
    ],
    "cantidad_unidades": 4,
    "configuracion_por_unidad": {
      "capacidad_base": {
        "adultos": 2,
        "menores": 0
      },
      "capacidad_familiar": {
        "adultos": 2,
        "menores": 2
      },
      "habitaciones": 1,
      "camas": {
        "king_size": 1,
        "sofa_cama_matrimonial": 1,
        "couchages_funcionales": 4
      }
    },
    "precio_por_unidad": {
      "total_2_noches_2_adultos_mxn": 5310,
      "total_2_noches_2_adultos_2_menores_mxn": 5790,
      "incluye_desayunos": true,
      "uso": "interno_hasta_confirmacion_final"
    },
    "espacios_observados_en_fotos_y_video": [
      "terraza exterior",
      "cama king size",
      "sofá cama matrimonial",
      "refrigerador",
      "lavabo",
      "televisión"
    ],
    "fotos": [
      "CAB-WOOD-01",
      "CAB-WOOD-02",
      "CAB-WOOD-03",
      "CAB-WOOD-04"
    ],
    "video": "CAB-WOOD-VID",
    "estado": "confirmado",
    "pendiente": [],
    "fuente": {
      "tipo": "mensaje_fotos_y_video_del_venue",
      "fecha_material": "2026-02-18",
      "registrado": "2026-07-29"
    }
  }
};
