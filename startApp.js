const { app, BrowserWindow } = require("electron");
const { server, port } = require("./bin/www");
const path = require('path');
const { Worker } = require('worker_threads');
const socketio = require('socket.io');

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1000,
    height: 650,
    title: "Resizer App",
    icon: "./appIcon.ico",
  });

  win.loadURL("http://localhost:3000");
  win.setMenuBarVisibility(false);
};

app.whenReady().then(() => {
  const worker = new Worker(path.join(__dirname, "workers", "syncWorker.js"));

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
    worker.on("message", (e) => {
      socket.emit(e.type, e.message);
    });
  });

  server.listen(port); // express.js server
  createWindow();
});
