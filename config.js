const config = {

  /**
   * this is the final destination of all resized images
   */
  resizedImagesDestination: "./resizedImages",

  /**
   * this is the temporary folder used by multer to save files in the incomming request
   */
  tmpFolder: "./uploads",

  /**
   * this is the default width used by sharp to resize the incomming image
   */
  defaultWidth: 615,

   /**
   * this is the default height used by sharp to resize the incomming image
   */
  defaultHeight: 800,

  /**
   * 
   */
   catalogFolder: "./catalog"

};

module.exports = config;