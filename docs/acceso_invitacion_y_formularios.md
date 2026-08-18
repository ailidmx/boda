# Acceso a la invitación y formularios privados

## Arquitectura publicada

La invitación está desplegada en Firebase:

- Firebase Hosting sirve la aplicación Vite y sus imágenes aprobadas.
- Firebase Authentication valida la clave compartida `vivamexico`.
- El navegador recuerda el acceso en el dispositivo.
- Cloud Firestore recibe los formularios en la región de Querétaro
  (`northamerica-south1`).
- Las reglas de seguridad permiten al usuario invitado crear respuestas, pero
  le impiden leer, modificar o borrar cualquier respuesta.
- Las altas y bajas públicas de cuentas están deshabilitadas.

La configuración pública de Firebase y el correo técnico del usuario invitado
pueden estar en el bundle. La contraseña no forma parte del código.

## Alcance de la puerta

La puerta protege la navegación normal de la aplicación y el acceso de
escritura al backend. Al tratarse de Hosting estático, una persona que conociera
la URL exacta de un recurso compilado podría solicitarlo directamente. No se
publica ninguna información privada de los invitados en esos archivos.

## Formularios activos

1. RSVP, identidad, grupo, menores, alojamiento y vuelos.
2. Sugerencias de comida, postre, música y participación en escena.
3. Sondeo sin compromiso para prolongar el viaje en Costalegre.

Las respuestas se guardan respectivamente en:

- `rsvp_submissions`
- `experience_suggestions`
- `coast_interest`

Solo los organizadores con acceso al proyecto Firebase pueden consultar esas
colecciones.

## Publicación

- Producción (`master`): `https://boda-david-y-ayde.web.app`
- Desarrollo (`develop`): `https://boda-500805.web.app`
- Proyecto: `boda-500805`
- Configuración: `firebase.json`
- Reglas: `firebase/firestore.rules`

Los pushes se publican mediante `.github/workflows/deploy-invitation.yml`.
Para publicar manualmente desde la raíz:

```bash
# Desarrollo
firebase deploy --only hosting:invitation-primary

# Producción
firebase deploy --only hosting:invitation-named
```
