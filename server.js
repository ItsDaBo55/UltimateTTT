const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Adjust as needed
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000, // Increase the ping timeout to 60 seconds
    pingInterval: 25000 // Adjust the ping interval as needed
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
const port = process.env.PORT || 3000
server.listen(port, () => {
    console.log(`Server is running on ${port}`);
});

io.on('connection', (socket) => {
    console.log('user connected')
    socket.on('newGame', (data) => {
        games[data.gameId] = { host: socket.id, players: [socket.id], gameState: {}, firstName: data.firstName, hostName: data.firstName };
    });

    socket.on('joinGame', (data) => {
        if (games[data.gameId] && games[data.gameId].players.length < 2) {
            games[data.gameId].players.push(socket.id);
            games[data.gameId].guestName = 
            io.to(games[data.gameId].host).emit('playerJoined', { gameId: data.gameId, guestName: data.guestName });
        }
    });

    socket.on('saveGameState', (data) => {
        if (games[data.gameId]) {
            games[data.gameId].gameState = data.gameState;
            games[data.gameId].available = data.gameState.available;
            games[data.gameId].hostLeft = data.gameState.hostLeft;
            games[data.gameId].guestLeft = data.gameState.guestLeft;
            games[data.gameId].hostName = data.hostName;
            games[data.gameId].guestName = data.guestName;
            io.to(games[data.gameId].players).emit('gameStateUpdated', { gameId: data.gameId, gameState: data.gameState, hostName: games[data.gameId].hostName, firstName: games[data.gameId].firstName, guestName: games[data.gameId].guestName});
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

    socket.on('chatMessage', (data) => {
        io.emit('chatMessage', data);
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

io.engine.on("connection_error", (err) => {
    console.log(err.req);      // the request object
    console.log(err.code);     // the error code, for example 1
    console.log(err.message);  // the error message, for example "Session ID unknown"
    console.log(err.context);  // some additional error context
});