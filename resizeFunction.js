const config = require("./config");
const path = require("path");
const sharp = require("sharp");

exports.resizeForWoocom = (file) => {
  if (file.mimetype === 'image/jpeg') {
    sharp(file.path)
      .resize({
        width: config.woocom.defaultWidth,
        height: config.woocom.defaultHeight
      })
      .toFile(path.join(config.resizedImagesDestination, file.originalname),
        function (err) {
          console.log(err);
          return err;
        }
      );
  } else {
    const filename = path.parse(file.originalname).name;
    sharp(file.path)
      .resize({
        width: config.woocom.defaultWidth,
        height: config.woocom.defaultHeight
      })
      .toFormat('jpeg')
      .toFile(path.join(config.resizedImagesDestination, filename+'.jpeg'),
        function (err) {
          console.log(err);
          return err;
        }
      );
  }

}

exports.resizeForWhatsappMaria = (file) => {
  if (file.mimetype === 'image/jpeg') {
    sharp(file.path)
      .resize({
        width: config.whatsapp.maria.defaultWidth,
        height: config.whatsapp.maria.defaultHeight
      })
      .toFile(path.join(config.resizedImagesDestination, file.originalname),
        function (err) {
          console.log(err);
          return err;
        }
      );
  } else {
    const filename = path.parse(file.originalname).name;
    sharp(file.path)
      .resize({
        width: config.whatsapp.maria.defaultWidth,
        height: config.whatsapp.maria.defaultHeight
      })
      .toFormat('jpeg')
      .toFile(path.join(config.resizedImagesDestination, filename+'.jpeg'),
        function (err) {
          console.log(err);
          return err;
        }
      );
  }

}

exports.resizeForWhatsappUN = (file) => {
  if (file.mimetype === 'image/jpeg') {
    sharp(file.path)
      .resize({
        width: config.whatsapp.un.defaultWidth,
        height: config.whatsapp.un.defaultHeight
      })
      .toFile(path.join(config.resizedImagesDestination, file.originalname),
        function (err) {
          console.log(err);
          return err;
        }
      );
  } else {
    const filename = path.parse(file.originalname).name;
    sharp(file.path)
      .resize({
        width: config.whatsapp.un.defaultWidth,
        height: config.whatsapp.un.defaultHeight
      })
      .toFormat('jpeg')
      .toFile(path.join(config.resizedImagesDestination, filename+'.jpeg'),
        function (err) {
          console.log(err);
          return err;
        }
      );
  }

}