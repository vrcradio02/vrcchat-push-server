const express = require('express');
const cors = require('cors');
const webpush = require('web-push');

const app = express();
app.use(cors());
app.use(express.json());

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'contact@vrcchat.com';

webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

const subscriptions = new Map();

app.post('/register', async (req, res) => {
  const { userId, subscription } = req.body;
  if (!userId || !subscription) {
    return res.status(400).json({ error: 'userId et subscription requis' });
  }
  subscriptions.set(userId, subscription);
  console.log(`✅ Abonnement enregistré pour ${userId}`);
  res.json({ success: true });
});

app.post('/unregister', async (req, res) => {
  const { userId } = req.body;
  if (userId) subscriptions.delete(userId);
  res.json({ success: true });
});

app.post('/send-push', async (req, res) => {
  const { userId, title, body, clickAction } = req.body;
  const sub = subscriptions.get(userId);

  if (!sub) {
    return res.status(404).json({ error: 'Utilisateur non abonné' });
  }

  try {
    await webpush.sendNotification(sub, JSON.stringify({
      title: title || 'VRCchat',
      body: body || 'Nouveau message',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: {
        url: clickAction || 'https://vrcchat.surge.sh'
      }
    }));
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur envoi push:', error);
    res.status(500).json({ error: 'Erreur envoi push' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Serveur push démarré sur le port ${PORT}`);
});
