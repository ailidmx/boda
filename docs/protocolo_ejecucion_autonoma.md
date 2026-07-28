# Protocolo de Ejecucion Autonoma / Protocole d'execution autonome

## ES
Modo operativo activo para este proyecto:
- No pedir confirmaciones intermedias para cambios normales de documentacion, backlog, proveedores, operacion y web.
- Ejecutar integraciones de forma inmediata al recibir nuevos datos.
- Mantener trazabilidad minima obligatoria en cada integracion:
  - Actualizar al menos 1 documento en `docs/` o modulo afectado.
  - Actualizar `tasks/backlog.md` cuando cambie estado o alcance de una tarea.
  - Actualizar web (`web/interface`) si el dato impacta comunicacion o planning.
- Solo detener ejecucion para preguntar cuando exista bloqueo real:
  - Conflicto de datos incompatible.
  - Falta de dato critico imposible de inferir.
  - Riesgo de publicar informacion sensible en canales publicos.

## FR
Mode operatoire actif pour ce projet :
- Ne pas demander de validations intermediaires pour les mises a jour normales de documentation, backlog, prestataires, operation et web.
- Executer les integrations immediatement a la reception de nouvelles informations.
- Traçabilite minimale obligatoire a chaque integration :
  - Mettre a jour au moins 1 document dans `docs/` ou le module concerne.
  - Mettre a jour `tasks/backlog.md` quand l'etat ou le perimetre d'une tache change.
  - Mettre a jour le web (`web/interface`) si l'information impacte la communication ou le planning.
- Interrompre seulement en cas de blocage reel :
  - Conflit de donnees incompatible.
  - Donnee critique manquante impossible a deduire.
  - Risque de publier des informations sensibles sur des canaux publics.
