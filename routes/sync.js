const router = require("express").Router();
const { default: axios } = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const chokidar = require("chokidar");
const config = require("../config/config");
const dirTree = require("directory-tree");
const wget = require("node-wget");
const { destinationFolder } = require("../config/config");
require("dotenv").config();

let remoteSyncServer = config.server;
let socket = null;

const fsWatcher = chokidar.watch(destinationFolder, {
  awaitWriteFinish: false,
  persistent: true,
  usePolling: true,
});

async function startSync() {
  axios
    .get(remoteSyncServer + "/sync/handshake")
    .then((data) => {
      doUpdate();
    })
    .catch((error) => {
      console.log("remote server is not running");
      return 0;
    });

  socket?.emit("syncStarted", `${socket?.id} has started watching`);
  socket?.emit("message", `target watched ${destinationFolder}`);

  fsWatcher.on("all", async (event, path) => {
    let type = event == "unlinkDir" || event == "addDir" ? "dir" : "file";

    if (event == "add" || event == "addDir" || event == "change") {
      const fileStat = fs.statSync(path);
      return syncWithCheck([
        {
          path: path,
          type: type == "dir" ? "directory" : "file",
          size: fileStat.size,
        },
      ]);
    }

    let fullPath = path;
    path = path.replace(destinationFolder, "");

    let changeData = {
      path: path,
      fullPath: fullPath,
      event: event,
      type: type,
      size: 0,
    };
    return enqueueChange(changeData);
  });

  fsWatcher.on("error", () => {
    socket?.emit("message", `An error occurs while watching - retrying`);
  });
}

async function enqueueChange(changeData) {
  changeData.path.replace(destinationFolder, "");
  changeData.path = path
    .normalize(changeData.path)
    .replace(path.normalize(destinationFolder), "");

  let formData = new FormData();
  let fullPath = changeData.fullPath;
  delete changeData.fullPath;

  if (
    changeData.event != "unlink" &&
    changeData.type == "file" &&
    changeData.event != "addDir"
  ) {
    const file = fs.createReadStream(fullPath);
    formData.append("file", file);
    setTimeout(() => {
      file.close();
    }, 5000);
  }

  formData.append("path", changeData.path);
  formData.append("event", changeData.event);
  formData.append("type", changeData.type);
  formData.append("size", changeData.size);

  syncWithServer(changeData.path, formData);
}

async function syncWithServer(path, formData) {
  if (!path) {
    return;
  }

  socket?.emit("uploadingStart", `started syncing ${path}`);

  await axios
    .post(remoteSyncServer + "/sync/upload", formData, {
      headers: {
        "x-api-key": process.env.PRIVATE_KEY,
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    })
    .then((data) => {
      socket?.emit("uploadingEnd", `${path} synced with remote server`);
    })
    .catch((error) => {
      socket?.emit("uploadingError", `failled to sync ${path}`);
      socket?.emit("uploadingError", error);
    });
}

function doUpdate() {
  const paths = [];
  function recurse(pathObject) {
    if (
      pathObject.hasOwnProperty("children") &&
      pathObject.children.length > 0
    ) {
      pathObject.children.forEach((child) => {
        return recurse(child);
      });
    } else {
      if (pathObject.hasOwnProperty("path")) {
        paths.push(pathObject);
      }
    }
  }

  recurse(dirTree(destinationFolder));
  syncWithCheck(paths);
  pullFromRemoteServer();
}

function syncWithCheck(paths) {
  paths.forEach(async (pathObject) => {
    const fullPath = pathObject.path;
    const filePath = path
      .normalize(pathObject.path)
      .replace(path.normalize(destinationFolder), "");
    const type = pathObject.type == "directory" ? "dir" : "file";
    const event = pathObject.type == "directory" ? "addDir" : "add";
    const size = pathObject.size || 0;

    const changeData = {
      path: filePath,
      fullPath: fullPath,
      event: event,
      type: type,
      size: size,
    };

    await axios
      .post(remoteSyncServer + "/sync/autoCheck", changeData, {
        headers: { "Content-Type": "application/json" },
      })
      .then((reply) => {
        if (reply.status == "202") {
          enqueueChange(changeData);
          return changeData;
        }
      })
      .catch((error) => {
        socket?.emit("message", error.message);
      });
  });
}

async function pullFromRemoteServer() {
  await axios.get(remoteSyncServer + "/sync/getTree").then((reply) => {
    const paths = reply.data;

    paths.forEach(async (pathObject) => {
      const fullPath = path.normalize(destinationFolder + pathObject.path);
      const url =
        remoteSyncServer + "/sync/getFile?filePath=" + pathObject.path;
      const dirPath = path.dirname(fullPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      if (!fs.existsSync(fullPath)) {
        wget({ url: url, dest: fullPath });
      } else {
        const currentFileStat = fs.statSync(fullPath); // FiXME update based on dates
        if (pathObject.size > currentFileStat.size) {
          wget({ url: url, dest: fullPath });
        }
      }
    });
  });
}

function setSocketSync(s) {
  socket = s;
  startSync();
}

module.exports = { router, startSync, setSocketSync };
