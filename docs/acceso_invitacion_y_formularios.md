# Acceso a la invitacion y formularios privados

## Decision recomendada

La clave compartida `vivamexico` puede usarse como puerta sencilla para
invitados, pero no debe validarse solamente en JavaScript si queremos proteger
los datos del RSVP.

### Opcion de previsualizacion

- Pantalla de acceso en el navegador.
- Clave recordada durante la sesion.
- Sin backend.
- Util solamente para evitar descubrimiento casual.
- No protege el contenido frente a una persona que inspeccione el codigo.

### Opcion para publicar

- Validar la clave en una funcion serverless.
- Guardar la clave como secreto del proveedor, nunca en Git.
- Crear una cookie de sesion segura, `HttpOnly`, `Secure` y con expiracion.
- Proteger tanto los archivos del sitio como los endpoints de formularios.
- Aplicar limite de intentos basico.

Cloudflare Pages Functions permite ejecutar autenticacion y procesamiento de
formularios antes de servir el sitio estatico. Las respuestas pueden enviarse
despues al Google Sheet privado mediante una credencial disponible solo en el
servidor.

## Formularios previstos

1. RSVP, identidad, grupo, menores, alojamiento y vuelos.
2. Sugerencias de comida, postre, musica y participacion en escena.
3. Sondeo sin compromiso para prolongar el viaje en Costalegre.

Los tres deben compartir identificador de invitado o contacto para evitar
duplicados y permitir actualizaciones posteriores.
