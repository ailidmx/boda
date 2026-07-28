# Benchmark Booking vs Cabanas Boda / Benchmark Booking vs cabanes boda

## ES
Objetivo:
Mapear oferta publica (Booking) contra mapeo interno de cabañas para calcular referencia de precio por invitado.

### Match confirmado (con base en URL + texto compartido)
- Booking listing: `cabana-31`
- Mapeo interno: `CABAÑAS_MADERA_31_2_ADULTOS`
- Capacidad usada en benchmark: 2 adultos

### Datos base usados (2 noches)
- Costo interno boda (archivo de cabanas): MXN 5,310 total
- Booking opcion A (no reembolsable): MXN 6,331 + MXN 1,329 impuestos/cargos = MXN 7,660
- Booking opcion B (parcialmente reembolsable): MXN 7,280 + MXN 1,529 impuestos/cargos = MXN 8,809
- Desayuno opcional Booking: MXN 2,183

### Comparativo rapido
1. Contra Booking opcion A (sin impuestos):
- Diferencia absoluta: MXN 1,021
- Diferencia porcentual: 19.23%

2. Contra Booking opcion A (con impuestos/cargos):
- Diferencia absoluta: MXN 2,350
- Diferencia porcentual: 44.26%

3. Contra Booking opcion B (sin impuestos):
- Diferencia absoluta: MXN 1,970
- Diferencia porcentual: 37.10%

4. Contra Booking opcion B (con impuestos/cargos):
- Diferencia absoluta: MXN 3,499
- Diferencia porcentual: 65.89%

### Lectura de negocio (ES)
- Si tomamos Booking como referencia publica, el costo interno negociado para cabaña 31 es significativamente mejor.
- Esto justifica el modelo de cobro transparente a invitadxs para alojamiento/desayuno, manteniendo el resto de la experiencia cubierto por novios.

## FR
Objectif :
Mapper l'offre publique (Booking) avec le mapping interne des cabanes pour calculer une reference de prix invite.

### Match confirme (selon URL + texte partage)
- Listing Booking : `cabana-31`
- Mapping interne : `CABAÑAS_MADERA_31_2_ADULTOS`
- Capacite utilisee pour le benchmark : 2 adultes

### Donnees de base (2 nuits)
- Cout interne boda (fichier cabanes) : MXN 5,310 total
- Booking option A (non remboursable) : MXN 6,331 + MXN 1,329 taxes/frais = MXN 7,660
- Booking option B (partiellement remboursable) : MXN 7,280 + MXN 1,529 taxes/frais = MXN 8,809
- Petit-dejeuner optionnel Booking : MXN 2,183

### Comparatif rapide
1. Contre Booking option A (hors taxes) :
- Ecart absolu : MXN 1,021
- Ecart en pourcentage : 19.23%

2. Contre Booking option A (avec taxes/frais) :
- Ecart absolu : MXN 2,350
- Ecart en pourcentage : 44.26%

3. Contre Booking option B (hors taxes) :
- Ecart absolu : MXN 1,970
- Ecart en pourcentage : 37.10%

4. Contre Booking option B (avec taxes/frais) :
- Ecart absolu : MXN 3,499
- Ecart en pourcentage : 65.89%

### Lecture business (FR)
- En prenant Booking comme reference publique, votre cout interne negocie pour la cabane 31 est nettement meilleur.
- Cela soutient un modele de facturation transparent pour hebergement/petits-dejeuners, avec le reste de l'experience offert par les maries.

## Extension a toutes les cabañas seleccionadas / Extension a toutes les cabanes selectionnees

## ES
Se extendio el benchmark a las 13 cabañas seleccionadas en `invitados/cabanas_inventario.csv`.

Archivo de salida:
- `presupuesto/benchmark_booking_cabanas_todas.csv`

Metodo aplicado:
1. Se tomo cabaña 31 como referencia real observada en Booking.
2. Se calcularon ratios Booking/Interno para 4 escenarios:
- NR base
- NR total con impuestos/cargos
- PR base
- PR total con impuestos/cargos
3. Se aplicaron esos ratios a cada cabaña seleccionada para estimar rango de precio publico comparable.

Importante:
- Esta extension es una estimacion de referencia comercial.
- No sustituye scraping directo ficha por ficha de cada unidad en Booking.

Lectura rapida:
- En todas las cabañas seleccionadas, el costo interno negociado queda por debajo del estimado publico Booking en los 4 escenarios.
- Esto fortalece el modelo de cobro transparente a invitadxs para alojamiento/desayuno.

## FR
Le benchmark a ete etendu aux 13 cabanes selectionnees dans `invitados/cabanas_inventario.csv`.

Fichier de sortie :
- `presupuesto/benchmark_booking_cabanas_todas.csv`

Methode appliquee :
1. La cabane 31 a ete prise comme reference reelle observee sur Booking.
2. Des ratios Booking/Interne ont ete calcules pour 4 scenarios :
- NR base
- NR total avec taxes/frais
- PR base
- PR total avec taxes/frais
3. Ces ratios ont ete appliques a chaque cabane selectionnee pour estimer une plage de prix public comparable.

Important :
- Cette extension est une estimation de reference commerciale.
- Elle ne remplace pas un scraping direct fiche par fiche de chaque unite sur Booking.

Lecture rapide :
- Pour toutes les cabanes selectionnees, le cout interne negocie reste inferieur a l'estimation publique Booking dans les 4 scenarios.
- Cela renforce le modele de facturation transparente hebergement/petits-dejeuners pour les invites.
