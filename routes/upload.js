const router = require("express").Router();
const multer = require("multer");
const fs = require("fs");
const config = require("../config");
const path = require("path");
const sharp = require("sharp");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, config.tmpFolder);
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now());
  },
});

const upload = multer({ storage: storage });

router.post("/", upload.array("images"), (req, res, next) => {
  const requestData = req.body;

  const folderPath = path.join(
    config.resizedImagesDestination,
    requestData.topCategory,
    requestData.sku
  );

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  req.files.forEach((file, index) => {
    if (/image/.test(file.mimetype)) {
      const fileExt = file.originalname.split(".").pop();
      let fileName = file.originalname;

      if (file.originalname != requestData.coverImage) {
        fileName = index + "." + fileExt;
      } else {
        fileName = "cover." + fileExt;
      }

      sharp(file.path)
        .resize({ width: config.defaultWidth, height: config.defaultHeight })
        .toFile(path.join(folderPath, fileName), function (err, info) {
          if (err) {
            return res.status(500).json({ message: err });
          }
        });
    }
  });

  return res.status(200).json({ message: "Uploaded" });
});

module.exports = router;
