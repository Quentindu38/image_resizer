const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const catalogRouter = require('./routes/catalog');
const config = require('./config');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use("/images", express.static(config.catalogFolder));
app.use("/resized", express.static(config.resizedImagesDestination));

app.use('/catalog', catalogRouter)

module.exports = app;
