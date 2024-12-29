require('dotenv').config();
const express = require('express');
const path = require('node:path');
const router = require('./router');
const session = require('express-session');
const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(router);

app.listen(PORT, () => { console.log(`servidor ativo http://localhost:${PORT}`) });