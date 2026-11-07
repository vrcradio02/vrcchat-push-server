const express = require('express');
const cors = require('cors');
const { admin } = require('./firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());

const userTokens = new Map();

app.post('/register', async (req, res) => {
  const { userId, token } = req.body;
  if (!userId || !token) {
    return res.status(400).json({ error: 'userId et token requis' });
  }
  userTokens.set(userId, token);
  console.log(`✅ Token enregistré pour ${userId}`);
  res.json({ success: true });
});

app.post('/unregister', async (req, res) => {
  const { userId } = req.body;
  if (userId) userTokens.delete(userId);
  res.json({ success: true });
});

app.post('/send-push', async (req, res) => {
  const { userId, title, body, clickAction } = req.body;
  const token = userTokens.get(userId);

  if (!token) {
    return res.status(404).json({ error: 'Utilisateur non abonné' });
  }

  try {
    await admin.messaging().send({
      token,
      notification: {
        title,
        body
      },
      data: {
        click_action: clickAction || 'https://vrcchat.surge.sh'
      },
      android: {
        notification: {
          icon: 'favicon.svg',
          sound: 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default'
          }
        }
      }
    });
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
