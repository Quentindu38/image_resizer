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

// Queues
const uploadQueue = new Queue(processSyncJobForUploads);
const downloadQueue = new Queue(processSyncJobForDownloads);

startSync();


async function startSync() {

  axios
    .get(remoteServerURL + "/sync/handshake")
    .then((data) => {
      console.log(data);
      doUpdates();
    })
    .catch((error) => {
      const message = "remote server is not running";
      try {
        parentPort.postMessage({type: "message", message: message});
      } catch (error) {
        console.log(message);
      }
      return 0;
    });
  const fsWatcher = chokidar.watch(destinationFolder, {
    awaitWriteFinish: false,
    persistent: true,
    usePolling: true,
    ignoreInitial: true,
  });

  fsWatcher.on("all", async (event, pathString) => {
    const type = event == "unlinkDir" || event == "addDir" ? "dir" : "file";
    const fullPath = pathString;
    pathString = pathString.replace(/\\/gi, "/").replace(
      path.normalize(destinationFolder).replace(/\\/gi, "/"),
      ""
    );
    let size = 0;
    
    if (event == "add" || event == "addDir" || event == "change") {
      const fileStat = fs.statSync(fullPath);
      size = fileStat.size || 0;
    }
    const changeData = {
      path: pathString,
      fullPath: fullPath,
      event: event,
      type: type,
      size: size,
    };

    return uploadQueue.push(changeData);
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
      // console.log(`${path} synced with remote server`);
      return data;
    })
    .catch((error) => {
      console.log(error.response.data);
      return error;
    });

    return reply;
}

async function getServerPaths() {
  const paths = await axios.get(remoteServerURL + "/sync/getTree").then((reply) => {
    return reply.data;
  });
  return paths;
}

function getLocalPaths() {
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
        const pathStat = fs.statSync(pathObject.path);
        pathObject.stat = pathStat;
        pathObject.path = pathObject.path.replace(/\\/gi, "/").replace(
          path.normalize(destinationFolder).replace(/\\/gi, "/"),
          ""
        );

        paths.push(pathObject);
      }
    }
  }

  recurse(dirTree(destinationFolder));
  return paths;
}

// make updates
async function doUpdates() {
  const serverPaths = await getServerPaths();
  const localPaths = getLocalPaths();

  const serverPathsArray = [];
  const localPathsArray = [];
  const missingPathsOnServer = [];
  const missingPathsOnLocal = [];

  serverPaths.forEach((value) => {
    serverPathsArray.push(value.path);
  });
  
  localPaths.forEach((localPathObject) => {
    localPathsArray.push(localPathObject.path);
    if(serverPathsArray.includes(localPathObject.path) == false) {
      missingPathsOnServer.push(localPathObject);
    } else {
      const indexOfPathObjectInServerPaths = serverPathsArray.indexOf(localPathObject.path);
      const serverPathObject = serverPaths[indexOfPathObjectInServerPaths];
      const localPathStat = localPathObject.stat;
      const remotePathStat = serverPathObject.stat;

      if(localPathStat.size > remotePathStat.size) {
        missingPathsOnServer.push(localPathObject);
      }
    }
  });

  serverPathsArray.forEach((pathString, index) => {
    const serverPathObject = serverPaths[index];
    if(localPathsArray.includes(pathString) == false) {
      missingPathsOnLocal.push(serverPathObject);
    } else {
      const indexOfPathObjectInLocalPaths = localPathsArray.indexOf(pathString);
      const localPathObject = localPaths[indexOfPathObjectInLocalPaths];
      const localPathStat = localPathObject.stat;
      const remotePathStat = serverPathObject.stat;

      if(localPathStat.size < remotePathStat.size) {
        missingPathsOnLocal.push(serverPathObject);
      }
    }
  });

  const message1 = serverPathsArray.length + " path(s) on remote server";
  const message2 = localPathsArray.length + " path(s) on local server";
  const message3 = missingPathsOnLocal.length + " path(s) missing on local server";
  const message4 = missingPathsOnServer.length + " path(s) missing on remote server";

  try {
    parentPort.postMessage({type: "message", message: message1});
    parentPort.postMessage({type: "message", message: message2});
    parentPort.postMessage({type: "message", message: message3});
    parentPort.postMessage({type: "message", message: message4});
  } catch (error) {
    console.log(message1);
    console.log(message2);
    console.log(message3);
    console.log(message4);
  }

  missingPathsOnLocal.forEach((pathObject) => {
    downloadQueue.push(pathObject);
  });
  
  missingPathsOnServer.forEach((pathObject) => {
    const event = pathObject.type == "directory" ? "addDir" : "add";
    const type = pathObject.type == "directory" ? "dir" : "file";
    const size = pathObject.size || 0;
    const path = pathObject.path;
    const fullPath = destinationFolder+pathObject.path;
    const changeData = {
      path: path,
      fullPath: fullPath,
      event: event,
      type: type,
      size: size,
    };

    uploadQueue.push(changeData);
  });
}


// Queues process functions
async function processSyncJobForUploads(changeData, done) {
  const requestData = {...changeData};
  delete requestData.fullPath;

  if(changeData.path == "" || changeData.path == ".") {
    done("invalid file or directory name");
    return;
  }

  const reply = await enqueueChange(changeData);
  done(null, reply.data.message);

};

async function processSyncJobForDownloads(pathObject, done) {

  const fullPath = path.normalize(destinationFolder + pathObject.path);
  const url =
    remoteServerURL + "/sync/getFile?filePath=" + pathObject.path;
  const dirPath = path.dirname(fullPath);
  
  if(pathObject.type == "file") {
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
  } else {
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }
};


uploadQueue.on('task_finish', function (taskId, result, stats) {
  const message = `[${(stats.elapsed/1000).toFixed(1) +"s"}][up] ${chalk.blueBright(result)}`;
  try {
    parentPort.postMessage({type: "message", message: message});
  } catch (error) {
    console.log(message);
  }
});

uploadQueue.on('task_failed', function (taskId, err, stats) {
  const message = `[${(stats.elapsed/1000).toFixed(1) +"s"}][up] ${chalk.redBright(err)}`;
  try {
    parentPort.postMessage({type: "message", message: message});
  } catch (error) {
    console.log(message);
  }
});

downloadQueue.on('task_finish', function (taskId, result, stats) {
  const message  =`[${(stats.elapsed/1000).toFixed(1) +"s"}][down] ${chalk.blueBright(result)}`;
  try {
    parentPort.postMessage({type: "message", message: message});
  } catch (error) {
    console.log(message);
  }
});

downloadQueue.on('task_failed', function (taskId, err, stats) {
  const message = `[${(stats.elapsed/1000).toFixed(1) +"s"}][down] ${chalk.redBright(err)}`;
  try {
    parentPort.postMessage({type: "message", message: message});
  } catch (error) {
    console.log(message);
  }
});

module.exports = {startSync};
