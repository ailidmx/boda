import { cloudinaryImage } from "./cloudinary.js";



/*
 * Public invitation media registry.
 *
 * All approved photos and videos are hosted on Cloudinary (cloud name
 * k2ajcgxv) under the `boda/` folder, tagged by section (HERO, NOVIOS,
 * ROCA_AZUL, COMIDA, CABANAS, VESTUARIO, ...). This module maps each public
 * id to the section that uses it and builds optimized delivery URLs.
 *
 * Cabin photos are stored in the Firestore `cabins` collection via the
 * `cloudinaryIds` field and read directly by the Accommodation section.
 *
 * The local WebP/MP4 derivatives in src/assets/approved/ are no longer

 * bundled; they remain only as the source for the Cloudinary upload script
 * (scripts/upload-to-cloudinary.mjs).
 */

const img = (publicId, opts) => cloudinaryImage(`boda/${publicId}`, opts);


// Hero slideshow. Each entry is { src, position? } where `position` is a CSS
// object-position value applied by main.js (focal point within the frame).
const hero = (publicId, position) =>
  position ? { src: img(publicId, { width: 1600 }), position } : { src: img(publicId, { width: 1600 }) };

export const MEDIA = {
  hero: [
    hero("couple-003"),
    hero("couple-013"),
    hero("couple-014", "center 35%"),
    hero("couple-018"),
    hero("couple-new-DSC05180"),
    hero("couple-new-IMG_20190313_205809", "center 35%"),
    hero("couple-new-IMG_20200627_223059", "center 35%"),
    hero("couple-new-IMG_20211030_184411"),
    hero("couple-new-IMG_20211228_225516"),
    hero("couple-new-IMG_20220819_095220", "center 35%"),
    hero("couple-new-20230129_214006", "center 65%"),
    hero("couple-new-IMG_2690"),
    hero("couple-new-IMG_3511", "center 35%"),
    hero("couple-new-IMG_4241"),
    hero("couple-new-IMG_4921", "center 35%"),
    hero("couple-new-IMG_5368"),
    hero("couple-new-IMG_5540"),
    hero("couple-new-102410", "center 35%"),
    hero("couple-new-42142cfb-0bf5-42a8-b462-d8af5dc0672c", "center 20%"),
  ],


  gallery: [
    // Chronological order (oldest first)
    img("couple-new-DSC05180", { width: 900 }),
    img("couple-new-IMG_20190313_205809", { width: 900 }),
    img("couple-new-IMG_20200627_223059", { width: 900 }),
    img("couple-new-IMG_20210211_225341_1", { width: 900 }),
    img("couple-new-IMG_20211030_184411", { width: 900 }),
    img("couple-new-IMG_20211228_225516", { width: 900 }),
    img("couple-new-IMG_20220819_095220", { width: 900 }),
    img("couple-new-20230129_214006", { width: 900 }),
    img("couple-new-IMG_2690", { width: 900 }),
    img("couple-new-IMG_3511", { width: 900 }),
    img("couple-new-IMG_4241", { width: 900 }),
    img("couple-new-IMG_4921", { width: 900 }),
    img("couple-new-IMG_5368", { width: 900 }),
    img("couple-new-IMG_5540", { width: 900 }),
    img("couple-new-102410", { width: 900 }),
    img("couple-new-113160", { width: 900 }),
    img("couple-new-42142cfb-0bf5-42a8-b462-d8af5dc0672c", { width: 900 }),
  ],
  // Facility cards are square (aspect-ratio 1:1), so the Cloudinary
  // transformation is forced to a square crop (c_fill) to match the container.
  venue: {
    cabins: img("venue-cabins", { width: 1200, height: 1200, crop: "fill" }),
    courts: img("venue-courts", { width: 1200, height: 1200, crop: "fill" }),
    gardens: img("venue-gardens", { width: 1200, height: 1200, crop: "fill" }),
    pool: img("venue-pool", { width: 1200, height: 1200, crop: "fill" }),
  },

  // Food cards are 4:3 (aspect-ratio 4/3 in CSS), so every image is delivered
  // with a fixed 4:3 crop (c_fill) to keep all cards visually identical.
  food: {
    // The updated food photos live at the Cloudinary account root (not under
    // `boda/`), so they are built directly with cloudinaryImage instead of the
    // `img` helper — same as the pizza card.
    carnitas: cloudinaryImage("carnitas_rtct2y", { width: 600, height: 450, crop: "fill" }),
    aguas: cloudinaryImage("aguas_kpoxib", { width: 600, height: 450, crop: "fill" }),

    esquites: cloudinaryImage("esquites_rzhsv6", { width: 600, height: 450, crop: "fill" }),
    tostilocos: cloudinaryImage("tostilocos_vrkadw", { width: 600, height: 450, crop: "fill" }),
    guacamole: cloudinaryImage("guacamole_inzf4m", { width: 600, height: 450, crop: "fill" }),

    nopales: cloudinaryImage("nopales_kyhrzh", { width: 600, height: 450, crop: "fill" }),
    pizza: cloudinaryImage("pizza_cxhngb", { width: 600, height: 450, crop: "fill" }),
    taquiza: cloudinaryImage("taquiza_zkqygq", { width: 600, height: 450, crop: "fill" }),
    // Doña Carmen — the cook behind the guisos. Used as a small circular badge
    // on the taquiza card and as a soft background motif in the guisos section.
    donaCarmen: cloudinaryImage("doña_carmen_cjsnz7", { width: 200, height: 200, crop: "fill" }),

    tejuino: cloudinaryImage("tejuino_davqad", { width: 600, height: 450, crop: "fill" }),
    tequila: cloudinaryImage("tequila_k7ewqm", { width: 600, height: 450, crop: "fill" }),
    // Dessert cards (previously missing photos).
    gelatinas: cloudinaryImage("gelatinas_lheogf", { width: 600, height: 450, crop: "fill" }),
    jericalla: cloudinaryImage("jericalla_tbwks9", { width: 600, height: 450, crop: "fill" }),
    "postres-tapatios": cloudinaryImage("dulces_xvb1nz", { width: 600, height: 450, crop: "fill" }),
  },






  // Live music acts — each card gets a photo of the act/band. These assets
  // live at the Cloudinary account root (not under the `boda/` folder), so
  // they are built directly with cloudinaryImage instead of the `img` helper.
  music: {
    marimba: cloudinaryImage("marimba_jclxjy", { width: 900 }),
    mariachi: cloudinaryImage("MARIACHIS_ivljyc", { width: 900 }),
    norteno: cloudinaryImage("norteños_izxes3", { width: 900 }),

    frenchBand: cloudinaryImage("38t_photo_yhx9m3", { width: 900 }),
    // 38 tonnes logo, overlaid in the top-right corner of the card.
    frenchBandLogo: cloudinaryImage("logo38t_aptkvz", { width: 200 }),
    // Marimba Vientos del Sur logo, overlaid in the top-right corner of the card.
    marimbaLogo: cloudinaryImage("marimbavientos_rfjmuw", { width: 200 }),
  },




  oaxaca: [
    img("oaxaca-01", { width: 800 }),
    img("oaxaca-02", { width: 800 }),
    img("oaxaca-04", { width: 800 }),
    img("oaxaca-05", { width: 800 }),
  ],
  // Wixárika (Huichol) photo montage shown in the dress-code section. These
  // assets live at the Cloudinary account root (not under the `boda/` folder),
  // so they are built directly with cloudinaryImage instead of the `img` helper.
  wixarica: [
    cloudinaryImage("wira_vciozb", { width: 800 }),
    cloudinaryImage("huitchol2_qtdwsp", { width: 800 }),
    cloudinaryImage("huitchol3_pu8upf", { width: 800 }),
    cloudinaryImage("huitchol_nsx8i6", { width: 800 }),
  ],

  // Party photo used as the background banner of the weekend section.
  weekendBanner: img("party-01", { width: 1600 }),

  // Parchment texture used as the background of the detailed programme's
  // timeline items (the "PROGRAMME DÉTAILLÉ" list). Lives at the account root
  // (not under `boda/`), so it is built directly with cloudinaryImage.
  parchment: cloudinaryImage("parch_m0kxlx", { width: 1200 }),

  // Papel picado (colourful cut-paper bunting) used as an alternative
  // background for the detailed programme, selectable by the guest. Lives at
  // the account root (not under `boda/`), so it is built directly with
  // cloudinaryImage.
  picado: cloudinaryImage("picado_irksg5", { width: 1200 }),



  // Pétanque club logo (GDL), used as a large, blurred, far-away background
  // motif in the pétanque section. The solid blue background is stripped via
  // Cloudinary's AI background removal so the logo floats transparently over
  // the section's blue base. Lives at the account root (not under `boda/`).
  petanqueLogo: cloudinaryImage("logogdl_odbmyu", {
    width: 1200,
    format: "png",
    effect: "backgroundRemoval",
  }),

};




