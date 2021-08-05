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
  req.files.forEach((file) => {
    // console.log(file);
    // file.path
    if (['image/png', 'image/jpeg', 'image/gif'].includes(file.mimetype)) {
      console.log(file.mimetype);
      console.log(file.path);
      sharp(file.path)
        .resize({width: 500, height: 200})
        .toFile(path.join(config.resizedImagesDestination, file.originalname), 
          function (err) {
            console.log(err);
          });
      /*fs.renameSync(
        file.path,
        path.join(config.resizedImagesDestination, file.originalname)
      );*/
    }
    /**
     * check the mimetype to ensure we are uploading an image
     * hint: file.mimetype
     */
  });

  return res.json({ message: "Uploaded" });
});

module.exports = router;
