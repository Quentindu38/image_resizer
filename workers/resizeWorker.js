const fs = require("fs");
const dirTree = require("directory-tree");
const config = require("../config/config");
const path = require("path");
const mime = require('mime');
const sharp = require('sharp');
const clientAppConfig = require("../config/config.json");
const { parentPort } = require("worker_threads");

function resize(filePath, filename) {
  let folderPath = path.dirname(filePath);
  const pathChunk = folderPath.split(/(\\|\/)/);
  folderPath = pathChunk.splice(pathChunk.length-6).join("");
  folderPath = clientAppConfig.destinationFolder+folderPath;
  const fullPath = path.join(folderPath, filename);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  /**
   * if file already resized - no action required - continue
   */
  if(fs.existsSync(fullPath)) {
    return true;
  }

  sharp(filePath)
    .resize({ width: config.defaultWidth, height: config.defaultHeight })
    .toFile(fullPath, function (err, info) {
      if (err) {
        return 0;
      }
      return 1;
    });
}

parentPort.once("message", (paths) => {
  paths.forEach(pathObject => {
    resize(pathObject.path, pathObject.name);
  });

  parentPort.postMessage("resize ok");
})