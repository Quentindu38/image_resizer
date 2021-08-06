const config = {

  /**
   * this is the final destination of all resized images
   */
  resizedImagesDestination: "./resizedImages",

  /**
   * this is the temporary folder used by multer to save files in the incomming request
   */
  tmpFolder: "./uploads",

  woocom: {
    /**
    * this is the default width used by sharp to resize the incomming image
    */
    defaultWidth: 615,

    /**
    * this is the default height used by sharp to resize the incomming image
    */
    defaultHeight: 800,
  },

  whatsapp: {
   maria: {
      /**
      * this is the default width used by sharp to resize the incomming image
      */
      defaultWidth: 834,

      /**
      * this is the default height used by sharp to resize the incomming image
      */
      defaultHeight: 1250,
   },
   un: {
      /**
      * this is the default width used by sharp to resize the incomming image
      */
      defaultWidth: 834,

      /**
      * this is the default height used by sharp to resize the incomming image
      */
      defaultHeight: 834,
   }
  },

};

module.exports = config;