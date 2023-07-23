const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const zlib = require('zlib');
const cron = require('node-cron');

// Configurer EJS comme moteur de templates
app.set('view engine', 'ejs');

// Servir les fichiers statiques depuis le dossier "contenu"
app.use(express.static('contenu'));

// Historique des messages
let messageHistory = [];

// Couleurs des utilisateurs
const userColors = {};

// Tâche planifiée pour nettoyer l'historique toutes les 24 heures (à minuit)
cron.schedule('0 0 * * *', () => {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000; // Une semaine en millisecondes
  messageHistory = messageHistory.filter((message) => message.timestamp >= oneWeekAgo);
});

// Démarrer le serveur
const port = 3000;
http.listen(port, () => {
  console.log(`Le serveur est en écoute sur le port ${port}`);
});

// Générer une couleur aléatoire au format #RRGGBB
function generateRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Gérer les connexions en temps réel avec Socket.IO
io.on('connection', (socket) => {
  console.log('Un utilisateur s\'est connecté');

  // Générer une couleur aléatoire pour l'utilisateur
  const userColor = generateRandomColor();
  userColors[socket.id] = userColor;

  // Gérer les déconnexions
  socket.on('disconnect', () => {
    console.log('Un utilisateur s\'est déconnecté');
    // Supprimer l'utilisateur de la liste des couleurs
    delete userColors[socket.id];
  });

  // Gérer l'envoi de messages
  socket.on('chat message', (data) => {
    console.log('Message reçu:', data.message);

    // Ajouter le message à l'historique avec le timestamp actuel
    messageHistory.push({ username: data.username, message: data.message, timestamp: Date.now(), color: userColors[socket.id] });

    // Diffuser le message à tous les utilisateurs connectés
    io.emit('chat message', { username: data.username, message: data.message, color: userColors[socket.id] });
  });

  // Envoyer l'historique des messages à un nouvel utilisateur
  socket.emit('chat history', messageHistory);
});

// Route pour afficher la page du chat
app.get('/', (req, res) => {
    res.render('index');
  });
  