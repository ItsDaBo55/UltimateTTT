const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Allow any origin for now
        methods: ["GET", "POST"]
    }
});

app.use(cors({
    origin: '*', // Allow any origin for now
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

let games = {};

app.get('/', (req, res) => {
    console.log("Server is running on 3000")
    res.send('Hello World!');
});

server.listen(3000, () => {
    console.log(`Server is running on 3000 host`);
});

io.on('connection', (socket) => {
    socket.on('newGame', (data) => {
        games[data.gameId] = { host: socket.id, players: [socket.id], gameState: {} };
    });

    socket.on('joinGame', (data) => {
        if (games[data.gameId] && games[data.gameId].players.length < 2) {
            games[data.gameId].players.push(socket.id);
            io.to(games[data.gameId].host).emit('playerJoined', { gameId: data.gameId });
        }
    });

    socket.on('saveGameState', (data) => {
        if (games[data.gameId]) {
            games[data.gameId].gameState = data.gameState;
            games[data.gameId].available = data.gameState.available;
            games[data.gameId].hostLeft = data.gameState.hostLeft;
            games[data.gameId].guestLeft = data.gameState.guestLeft;
            io.to(games[data.gameId].players).emit('gameStateUpdated', { gameId: data.gameId, gameState: data.gameState });
        }
    });

    socket.on('loadGameState', (data) => {
        if (games[data.gameId]) {
            socket.emit('gameStateUpdated', { gameId: data.gameId, gameState: games[data.gameId].gameState });
        }
    });

    socket.on('playerLeft', (data) => {
        if (games[data.gameId]) {
            if (data.hostLeft) {
                games[data.gameId].hostLeft = true;
            } else {
                games[data.gameId].guestLeft = true;
            }
            io.to(games[data.gameId].players).emit('playerLeft', { gameId: data.gameId });
        }
    });

    socket.on('disconnect', () => {
        for (const gameId in games) {
            const game = games[gameId];
            game.players = game.players.filter(playerId => playerId !== socket.id);
            if (game.players.length === 0) {
                delete games[gameId];
            }
        }
    });
});
