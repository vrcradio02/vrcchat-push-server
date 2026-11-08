# vrcchat-push-server

Serveur Web Push minimal pour VRCchat (Render + `web-push`).

## Variables d'environnement Render

- `VAPID_PUBLIC_KEY` — clé publique VAPID
- `VAPID_PRIVATE_KEY` — clé privée VAPID
- `VAPID_EMAIL` — `mailto:...` ou adresse e-mail (normalisée automatiquement)

## Endpoints

- `GET /health` — vérifie que le service est réveillé
- `POST /register` — `{ userId, subscription }`
- `POST /unregister` — `{ userId, endpoint? }`
- `POST /send-push` — `{ userId, title, body, clickAction }`

Les abonnements sont gardés en mémoire et envoyés à tous les appareils d'un
utilisateur. Un workflow GitHub Actions ping `/health` toutes les 5 minutes pour
éviter la mise en veille de l'instance Render gratuite.
