# Modelo de Acceso Web / Modele d'acces / Access model

## ES
Objetivo:
- private_planning: solo novios y equipo interno
- public_site: invitados y publico

Implementacion sugerida (fase inicial):
1. Publicar solo public_site.
2. Mantener private_planning fuera del deploy publico.
3. Si private_planning necesita web online, proteger con login (password + lista de usuarios).

Regla de datos:
- No publicar datos personales de invitados en rutas publicas.

## FR
Objectif :
- private_planning : seulement les maries et l'equipe interne
- public_site : invites et public

Implementation suggeree (phase initiale) :
1. Publier uniquement public_site.
2. Garder private_planning hors du deploiement public.
3. Si private_planning doit etre en ligne, proteger avec login (mot de passe + liste d'utilisateurs).

Regle de donnees :
- Ne pas publier de donnees personnelles d'invites sur des routes publiques.

## EN
Goal:
- private_planning: only the couple and internal team
- public_site: guests and public

Suggested implementation (initial phase):
1. Deploy only public_site.
2. Keep private_planning out of public deployment.
3. If private_planning must be online, protect it with login (password + user list).

Data rule:
- Do not publish guest personal data in public routes.
