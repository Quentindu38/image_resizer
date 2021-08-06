const router = require("express").Router();
const fs = require("fs");
const dirTree = require("directory-tree");
const config = require("../config");
const path = require("path");
const mime = require('mime');
const sharp = require('sharp');
const catalogFolder = require("../config.json");
config.catalogFolder = catalogFolder.catalogFolder;

router.get("/", (req, res, next) => {
  
  const paths = getFiles(config.catalogFolder);
  const folderStructure = {};
  const host = req.protocol+"://"+req.get('host');
  
  paths.forEach(pathObject => {
    const pathChunk = pathObject.path.split(/(\\|\/)/).filter(p => p!= "\\");
    const [topCategory, sku, color, filename] = pathChunk.slice(pathChunk.length-4);

    if(!folderStructure.hasOwnProperty(topCategory)) {
      folderStructure[topCategory] = {};
    }
    if(!folderStructure[topCategory].hasOwnProperty(sku)) {
      folderStructure[topCategory][sku] = {};
    }
    if(!folderStructure[topCategory][sku].hasOwnProperty(color)) {
      folderStructure[topCategory][sku][color] = [];
    }
    folderStructure[topCategory][sku][color].push( host+`/images/${topCategory}/${sku}/${color}/${filename}`);
  })
  
  return res.json(folderStructure);
});

router.get("/resized", (req, res, next) => {
  
  const paths = getFiles(config.resizedImagesDestination);
  const folderStructure = {};
  const host = req.protocol+"://"+req.get('host');

  paths.forEach(pathObject => {
    const pathChunk = pathObject.path.split(/(\\|\/)/).filter(p => p!= "\\");
    pathChunk.shift();
    const [topCategory, sku, color, filename] = pathChunk;

    if(!folderStructure.hasOwnProperty(topCategory)) {
      folderStructure[topCategory] = {};
    }
    if(!folderStructure[topCategory].hasOwnProperty(sku)) {
      folderStructure[topCategory][sku] = {};
    }
    if(!folderStructure[topCategory][sku].hasOwnProperty(color)) {
      folderStructure[topCategory][sku][color] = [];
    }
    folderStructure[topCategory][sku][color].push( host+`/resized/${topCategory}/${sku}/${color}/${filename}`);
  })
  
  return res.json(folderStructure);
});

router.post('/catalogFolder', (req, res) => {
  const requestData = req.body;
  console.log("Changing folder");

  const data = {
    catalogFolder: requestData.catalogFolder,
  }
  console.log(req.body);
  fs.writeFileSync("./config.json", JSON.stringify(data));

  res.json({success: true});

})

router.get('/resizeAll', (req, res, next) => {
  const paths = getFiles(config.catalogFolder);
  paths.forEach(pathObject => {
    resize(pathObject.path, pathObject.name);
  })

  return res.status(200).json({success: true});
})

function getFiles(folder) {
  const paths = [];
  function recurse(pathObject) {
    if(!pathObject) return;
    if (
      pathObject.hasOwnProperty("children") &&
      pathObject.children.length > 0
    ) {
      pathObject.children.forEach((child) => {
        return recurse(child);
      });
    } else {
      if (pathObject.hasOwnProperty("path")) {
        if(pathObject.type == 'file' && /image/.test(mime.getType(pathObject.path))) { 
          paths.push(pathObject);
        }
      }
    }
  }

  recurse(dirTree(folder));
  return paths;
}

function resize(filePath, filename) {
  let folderPath = path.dirname(filePath);
  const pathChunk = folderPath.split(/(\\|\/)/);
  folderPath = pathChunk.splice(pathChunk.length-6).join("");
  folderPath = config.resizedImagesDestination+folderPath;
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

module.exports = router;
