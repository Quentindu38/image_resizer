const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const catalogRouter = require('./routes/catalog');
const http = require('http');
const { destinationFolder, sourceFolder } = require("./config/config.json");
const indexRouter = require('./routes/index');
const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

const server = http.createServer(app);

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use("/images", express.static(sourceFolder));
app.use("/resized", express.static(destinationFolder));
app.use("/", indexRouter);

app.use('/catalog', catalogRouter)

module.exports = {app, server};
