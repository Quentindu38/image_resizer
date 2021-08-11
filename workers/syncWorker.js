const router = require("express").Router();
const { default: axios } = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const chokidar = require("chokidar");
const dirTree = require("directory-tree");
const wget = require("node-wget");
const { destinationFolder, remoteServerURL } = require("../config/config.json");
const config = require("../config/config");
const Queue = require('better-queue');
const chalk = require("chalk");
const {parentPort} = require("worker_threads");


startSync();


async function startSync() {
  axios
    .get(remoteServerURL + "/sync/handshake")
    .then((data) => {
      console.log("Updating ...")
      pullFromRemoteServer();
    })
    .catch((error) => {
      console.log("remote server is not running");
      return 0;
    });

  const fsWatcher = chokidar.watch(destinationFolder, {
    awaitWriteFinish: false,
    persistent: true,
    usePolling: true,
  });

  fsWatcher.on("all", async (event, path) => {
    let type = event == "unlinkDir" || event == "addDir" ? "dir" : "file";

    if (event == "add" || event == "addDir" || event == "change") {
      const fileStat = fs.statSync(path);
      // is file or dir, require long pulling, the queue it
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

  fsWatcher.on("error", (error) => {
    console.log(error)
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

  return syncWithServer(changeData.path, formData);
}

async function syncWithServer(path, formData) {
  if (!path) {
    return;
  }

  const reply = await axios
    .post(remoteServerURL + "/sync/upload", formData, {
      headers: {
        "x-api-key": config.PRIVATE_KEY,
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    })
    .then((data) => {
      console.log(`${path} synced with remote server`);
      return data;
    })
    .catch((error) => {
      console.log(error.response.data);
      return error;
    });

    return reply;
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

    uploadQueue.push(changeData);
      
  });
}

async function pullFromRemoteServer() {
  await axios.get(remoteServerURL + "/sync/getTree").then((reply) => {
    const paths = reply.data;
    paths.forEach(async (pathObject) => {
      downloadQueue.push(pathObject);
    });
  });
}

async function processSyncJobForUploads(changeData, done) {

  const requestData = {...changeData};
  delete requestData.fullPath;

  await axios.post(remoteServerURL + "/sync/autoCheck", requestData, {headers: {"Content-Type": "application/json"}})
  .then(async(response) => {
    
    if (response.status == "202") {
      const reply = await enqueueChange(changeData);
      done(null, reply);
    } else {
      done(null, `${changeData.path}: ${response.data.message}` || "Up to date");
    }
  })
  .catch((error) => {
    done(error);
    process.exit();
  });

};

async function processSyncJobForDownloads(pathObject, done) {

  const fullPath = path.normalize(destinationFolder + pathObject.path);
  const url =
    remoteServerURL + "/sync/getFile?filePath=" + pathObject.path;
  const dirPath = path.dirname(fullPath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  if (!fs.existsSync(fullPath)) {
    wget({ url: url, dest: fullPath }, () => {
      done(null, `${fullPath} downloaded`);
    });
  } else {
    const currentFileStat = fs.statSync(fullPath); // FiXME update based on dates
    if (pathObject.size > currentFileStat.size) {
      wget({ url: url, dest: fullPath }, ()=>{
        done(null, `${fullPath} updated`);
      });
    }

    done(null, `${fullPath} is up to date`);
  }
};

const uploadQueue = new Queue(processSyncJobForUploads);
const downloadQueue = new Queue(processSyncJobForDownloads);


uploadQueue.on('task_finish', function (taskId, result, stats) {
  parentPort.postMessage({type: "message", message: `[${(stats.elapsed/1000).toFixed(1) +"s"}][up] ${chalk.blueBright(result)}`});
});
uploadQueue.on('task_failed', function (taskId, err, stats) {
  parentPort.postMessage({type: "message", message: `[${(stats.elapsed/1000).toFixed(1) +"s"}][up] ${chalk.redBright(err)}`});
});

downloadQueue.on('task_finish', function (taskId, result, stats) {
  parentPort.postMessage({type: "message", message: `[${(stats.elapsed/1000).toFixed(1) +"s"}][down] ${chalk.blueBright(result)}`});
});
downloadQueue.on('task_failed', function (taskId, err, stats) {
  parentPort.postMessage({type: "message", message: `[${(stats.elapsed/1000).toFixed(1) +"s"}][down] ${chalk.redBright(err)}`});
});

module.exports = {startSync};
