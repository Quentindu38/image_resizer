const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const uploadRouter = require('./routes/upload');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/upload', uploadRouter);

module.exports = app;
