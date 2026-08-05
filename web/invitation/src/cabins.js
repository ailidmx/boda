/**
 * Public cabin labels used by the invitation. The values mirror the Firestore
 * `cabins` inventory without exposing operational booking and payment fields
 * to guests.
 * Occupancy is deliberately not stored here: it is derived from room
 * assignments at runtime.
 */

const STATIC_CABINS = [
  { id: "VILLA AZALEA", name: "VILLA AZALEA - 12p", capacity: 12, totalPrice2Nights: 8470, pricePerPerson2Nights: 706, isPrivate: false },
  { id: "VILLA DALIA", name: "VILLA DALIA - 10p", capacity: 10, totalPrice2Nights: 11150, pricePerPerson2Nights: 1115, isPrivate: false },
  { id: "VILLA MARGARITA", name: "VILLA MARGARITA - 10p", capacity: 10, totalPrice2Nights: 11150, pricePerPerson2Nights: 1115, isPrivate: false },
  { id: "VILLA LAVANDA", name: "VILLA LAVANDA - 4p", capacity: 4, totalPrice2Nights: 5980, pricePerPerson2Nights: 1495, isPrivate: false },
  { id: "VILLA HORTENCIA", name: "VILLA HORTENCIA - 2p", capacity: 2, totalPrice2Nights: 5310, pricePerPerson2Nights: 2655, isPrivate: true },
  { id: "CABAÑA 1", name: "CABAÑA MADERA - 2p", capacity: 2, totalPrice2Nights: 5310, pricePerPerson2Nights: 2655, isPrivate: true },
  { id: "CABAÑA 2", name: "CABAÑA MADERA - 2p", capacity: 2, totalPrice2Nights: 5310, pricePerPerson2Nights: 2655, isPrivate: true },
  { id: "CABAÑA 3", name: "CABAÑA MADERA - 2p", capacity: 2, totalPrice2Nights: 5310, pricePerPerson2Nights: 2655, isPrivate: true },
  { id: "CABAÑA 4", name: "CABAÑA MADERA - 2p", capacity: 2, totalPrice2Nights: 5310, pricePerPerson2Nights: 2655, isPrivate: true },
  { id: "VILLA DON AGUSTIN", name: "VILLA DON AGUSTIN - 4p", capacity: 4, totalPrice2Nights: 5980, pricePerPerson2Nights: 1495, isPrivate: true },
  { id: "VILLA DON RAFA", name: "VILLA DON RAFA - 6p", capacity: 6, totalPrice2Nights: 7210, pricePerPerson2Nights: 1202, isPrivate: true },
  { id: "SUITE DON CARLOS", name: "SUITE DON CARLOS - 8p", capacity: 8, totalPrice2Nights: 9640, pricePerPerson2Nights: 1205, isPrivate: false },
  { id: "CASONA", name: "CASONA - 18p", capacity: 18, totalPrice2Nights: 16980, pricePerPerson2Nights: 943, isPrivate: false },
];

export async function loadCabins() {
  return STATIC_CABINS;
}

export function getCabin(cabinIdOrName) {
  if (!cabinIdOrName) return null;
  const normalized = cabinIdOrName.trim().toLocaleUpperCase();
  return STATIC_CABINS.find((cabin) =>
    cabin.id?.toLocaleUpperCase() === normalized
      || cabin.name?.toLocaleUpperCase() === normalized,
  ) || null;
}
