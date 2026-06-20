const express = require("express");
const http = require("http");
const {WebSocketServer} = require("ws");
const {v4: uuid} = require("uuid");
const cors = require("cors");
const {SudokuGame} = require("./game");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({server});

// GAME STATE (in memory)
const games = new Map();
const sudoku = new SudokuGame();


const users = new Map();

app.use(express.json());
app.use(cors());

app.get("/", (_, res) => {
    res.send("Sudoku server running");
});

// make a new multiplayer game
app.post("/api/game", (req, res) => {
    const {userId, difficulty, board, inputs, selectors} = req.body;

    const gameId = uuid();

    const game = {
        id: gameId,
        owner: userId,
        difficulty,
        board,
        inputs,
        selectors,
        users: [
            {id: userId}
        ],
        status: 'playing',
        isMultiplayer: true,
    };
    games.set(gameId, game);

    res.json(game);
});

app.get("/api/game/:id", (req, res) => {
    const gameId = req.params.id;

    const game = games.get(gameId);

    if (!game) {
        return res.status(404).json({
            error: "Game not found",
        });
    }

    res.json(game)
})
app.get("/api/users", (req, res) => {
    const usersArray = Array.from(users.entries()).map(([id, username]) => ({id, username}));

    res.json(usersArray)
})

wss.on("connection", (socket) => {
    socket.id = uuid();

    socket.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        const userId = msg.userId;
        console.log("MessageReceived ", msg);

        if (msg.type === "chat") {
            broadcastToAll(JSON.stringify({
                type: "chat",
                id: msg.id,
                author: userId,
                message: msg.message,
                timestamp: msg.timestamp,
            }))
            return;
        }

        if (msg.type === "userInfoUpdate") {
            const username = msg.username;
            users.set(userId, username);

            broadcastToAll(JSON.stringify({
                type: "userInfoUpdated",
                userId,
                username
            }))
        }
        const game = games.get(msg.gameId);

        if (!game) return;
        switch (msg.type) {
            case "joinGame": {
                game.users = sudoku.upsertUser(game.users, {
                    id: userId
                });

                broadcastToAll(JSON.stringify({
                    type: "usersUpdated",
                    gameId: msg.gameId,
                    users: game.users
                }));
                break;
            }
            case "leaveGame": {
                game.users = sudoku.leaveUser(game.users, {
                    id: userId
                })
                let newOwner;
                if (game.owner === userId) {
                    if (game.users.length > 0) {
                        newOwner = game.users[0].id
                    } else {
                        games.delete(msg.gameId);
                        return;
                    }
                }

                broadcastToAll(JSON.stringify({
                    type: "usersUpdated",
                    gameId: msg.gameId,
                    users: game.users,
                    newOwner
                }));
                break;
            }
            case "kickUser": {
                if (userId === game.owner && userId !== msg.kickedUser) {
                    game.users = sudoku.leaveUser(game.users, {
                        id: msg.kickedUser
                    })

                    broadcastToAll(JSON.stringify({
                        type: "usersUpdated",
                        gameId: msg.gameId,
                        users: game.users
                    }));
                }
                break;
            }
            case "moveSelector": {
                const selector = {
                    x: msg.x,
                    y: msg.y,
                    author: msg.author
                }
                game.selectors = sudoku.upsertSelector(game.selectors, selector);

                broadcastToAll(JSON.stringify({
                    type: "selectorMoved",
                    gameId: msg.gameId,
                    selector: selector,
                }))
                break;
            }
            case "changeCellValue": {
                const cellInput = {
                    x: msg.x,
                    y: msg.y,
                    value: msg.value,
                    author: msg.author
                }
                game.inputs = sudoku.upsertInput(game.inputs, cellInput);

                broadcastToAll(
                    JSON.stringify({
                        type: "cellValueChanged",
                        gameId: msg.gameId,
                        cellInput,
                    })
                );
                break;
            }
            case "solveGame":
                game.status = 'solved';
                const solvedBoard = msg.solution;

                games.delete(msg.gameId);

                broadcastToAll(
                    JSON.stringify({
                        type: "gameSolved",
                        gameId: msg.gameId,
                        solution: solvedBoard,
                    })
                );
                break;

        }
    });
});

function broadcastToAll(message) {
    wss.clients.forEach((client) => {
        client.send(message);
    })
}

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
