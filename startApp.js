const { app, BrowserWindow } = require("electron");
const { server, port } = require("./bin/www");

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
  server.listen(port); // express.js server
  createWindow();
});
