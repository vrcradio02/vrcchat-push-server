const express = require('express');
const cors = require('cors');
const webpush = require('web-push');

const app = express();
app.use(cors());
app.use(express.json({ limit: '64kb' }));

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const rawVapidEmail = process.env.VAPID_EMAIL || 'contact@vrcchat.com';
const vapidEmail = /^(mailto:|https?:\/\/)/i.test(rawVapidEmail)
  ? rawVapidEmail
  : rawVapidEmail.includes('@')
    ? `mailto:${rawVapidEmail}`
    : rawVapidEmail;

if (!vapidPublicKey || !vapidPrivateKey) {
  console.error('VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY sont requis.');
  process.exit(1);
}

webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

// Un utilisateur peut être abonné sur plusieurs appareils (PC + téléphone).
// Map<userId, Map<endpoint, subscription>>
const subscriptions = new Map();

function subscriptionsFor(userId) {
  let devices = subscriptions.get(userId);
  if (!devices) {
    devices = new Map();
    subscriptions.set(userId, devices);
  }
  return devices;
}

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'vrcchat-push-server' });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, users: subscriptions.size });
});

app.post('/register', (req, res) => {
  const { userId, subscription } = req.body || {};
  if (!userId || !subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'userId et subscription.endpoint requis' });
  }

  subscriptionsFor(userId).set(subscription.endpoint, subscription);
  console.log(`✅ Abonnement enregistré pour ${userId} (${subscriptions.get(userId).size} appareil(s))`);
  res.json({ success: true });
});

app.post('/unregister', (req, res) => {
  const { userId, endpoint } = req.body || {};
  if (userId) {
    const devices = subscriptions.get(userId);
    if (devices) {
      if (endpoint) {
        devices.delete(endpoint);
      } else {
        subscriptions.delete(userId);
      }
      if (devices.size === 0) subscriptions.delete(userId);
    }
  }
  res.json({ success: true });
});

app.post('/send-push', async (req, res) => {
  const { userId, title, body, clickAction } = req.body || {};
  const devices = subscriptions.get(userId);

  if (!devices || devices.size === 0) {
    return res.status(404).json({ error: 'Utilisateur non abonné' });
  }

  const payload = JSON.stringify({
    title: title || 'VRCchat',
    body: body || 'Nouveau message',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'vrcchat-message',
    data: {
      url: clickAction || 'https://vrcchat.surge.sh',
    },
  });

  let sent = 0;
  let failed = 0;
  const staleEndpoints = [];

  await Promise.all(
    [...devices.entries()].map(async ([endpoint, subscription]) => {
      try {
        await webpush.sendNotification(subscription, payload);
        sent += 1;
      } catch (error) {
        failed += 1;
        if (error.statusCode === 404 || error.statusCode === 410) {
          staleEndpoints.push(endpoint);
        } else {
          console.error('Erreur envoi push:', error.statusCode || error.message);
        }
      }
    }),
  );

  for (const endpoint of staleEndpoints) devices.delete(endpoint);
  if (devices.size === 0) subscriptions.delete(userId);

  if (sent === 0) {
    return res.status(502).json({ error: 'Aucune push délivrée', failed });
  }
  res.json({ success: true, sent, failed });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Serveur push démarré sur le port ${PORT}`);
});
