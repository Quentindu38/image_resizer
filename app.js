const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const catalogRouter = require('./routes/catalog');
var http = require('http');
const socketio = require('socket.io');
const { setSocketSync } = require('./routes/sync');
const { destinationFolder, sourceFolder } = require("./config/config.json");

const app = express();

const server = http.createServer(app);

const io = socketio(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    transports: ['websocket'],
    upgrade: false
  },
});

io.on("connection", async (socket) => {
  socket.emit("message", `Host connected ${socket.id}`);
  setSocketSync(socket);
});

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use("/images", express.static(sourceFolder));
app.use("/resized", express.static(destinationFolder));

app.use('/catalog', catalogRouter)

module.exports = {app, server};
