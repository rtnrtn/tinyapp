/* eslint-disable prefer-destructuring */
const express = require('express');

const app = express();
const PORT = 8080;
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');

const saltRounds = 10;
const { getUserByEmail } = require('./helpers');

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(cookieSession({
  name: 'session',
  keys: ['randomstring', 'anotherrandomstring'],
}));

const users = {
  userRandomID: {
    id: 'userRandomID',
    email: 'user@example.com',
    password: 'purple-monkey-dinosaur',
  },
  user2RandomID: {
    id: 'user2RandomID',
    email: 'user2@example.com',
    password: 'dishwasher-funk',
  },
};

const generateRandomString = function () {
  const randomString = Math.random().toString(36).slice(2, 8);
  return randomString;
};

const urlDatabase = {
  b2xVn2: { longURL: 'http://www.lighthouselabs.ca', userID: 'userRandomID' },
  '9sm5xK': { longURL: 'http://www.google.com', userID: 'user2RandomID' },
};

const urlsForUser = function (id) {
  const urlsForUserID = {};
  for (const key of Object.keys(urlDatabase)) {
    const value = urlDatabase[key];
    if (value.userID === id) {
      urlsForUserID[key] = value;
    }
  }
  return urlsForUserID;
};

/// ROUTES ///
/// GET / and redirect to GET /login if user isn't logged in or to GET /urls if user is logged in
app.get('/', (req, res) => {
  const userID = req.session.user_id;
  if (!userID) {
    res.redirect('/login');
  } else {
    res.redirect('/urls');
  }
});
/// GET list of all URLs in database in JSON format
app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});
/// GET /urls, urls_index file displays error if user isn't logged in
app.get('/urls', (req, res) => {
  const userID = req.session.user_id;
  const templateVars = {
    user: users[userID],
    urls: urlsForUser(userID),
  };
  res.render('urls_index', templateVars);
});
/// GET /urls/new if user is logged in, otherwise redirect to GET /login
app.get('/urls/new', (req, res) => {
  const userID = req.session.user_id;
  const templateVars = { user: users[userID] };
  if (!userID) {
    res.redirect('/login');
  } else {
    res.render('urls_new', templateVars);
  }
});
/// GET /urls/:shortURL only if :shortURL exists and if user is logged in and owns :shortURL
app.get('/urls/:shortURL', (req, res) => {
  const shortURL = req.params.shortURL;
  const url = urlDatabase[shortURL];
  const userID = req.session.user_id;
  const templateVars = { user: users[userID] };
  if (!url) {
    res.statusCode = 404;
    res.render('404', templateVars);
    return;
  }
  templateVars.ownerIsLoggedIn = url.userID === userID;
  if (templateVars.ownerIsLoggedIn) {
    templateVars.shortURL = shortURL;
    templateVars.longURL = urlDatabase[shortURL].longURL;
  }
  res.render('urls_show', templateVars);
});
/// GET /u/:shortURL only if :shortURL exists and points to a valid longURL
app.get('/u/:shortURL', (req, res) => {
  const shortURL = req.params.shortURL;
  const url = urlDatabase[shortURL];
  const userID = req.session.user_id;
  const templateVars = { user: users[userID] };
  if (!url) {
    res.statusCode = 404;
    res.render('404', templateVars);
    return;
  }
  const longURL = url.longURL;
  if (!longURL) {
    res.statusCode = 404;
    res.render('404', templateVars);
  } else {
    res.redirect(longURL);
  }
});
/// GET /register only if user is not logged in, otherwise redirect to GET /urls
app.get('/register', (req, res) => {
  const userID = req.session.user_id;
  const templateVars = { user: users[userID] };
  if (!userID) {
    res.render('register', templateVars);
  } else {
    res.redirect('/urls');
  }
});
/// GET /login only if user is not logged in, otherwise redirect to GET /urls
app.get('/login', (req, res) => {
  const userID = req.session.user_id;
  const templateVars = { user: users[userID] };
  if (!userID) {
    res.render('login', templateVars);
  } else {
    res.redirect('/urls');
  }
});
/// POST to /urls only if user is logged in
app.post('/urls', (req, res) => {
  const userID = req.session.user_id;
  if (!userID) {
    res.statusCode = 400;
    const templateVars = {
      user: null,
      message: 'You are not logged in.',
    };
    res.render('400', templateVars);
    return;
  }
  const longURL = req.body.longURL;
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL,
    userID,
  };
  res.redirect(`/urls/${shortURL}`);
});
/// POST to /urls/:shortURL/delete only if user is logged in and owns :shortURL
app.post('/urls/:shortURL/delete', (req, res) => {
  const userID = req.session.user_id;
  if (!userID) {
    res.statusCode = 400;
    const templateVars = {
      user: null,
      message: 'You are not logged in.',
    };
    res.render('400', templateVars);
    return;
  }
  const shortURL = req.params.shortURL;
  const url = urlDatabase[shortURL];
  const ownerIsLoggedIn = url.userID === userID;
  if (ownerIsLoggedIn) {
    delete urlDatabase[shortURL];
  }
  res.redirect('/urls');
});
/// POST to /urls/:id only if user is logged in and owns :id
app.post('/urls/:id', (req, res) => {
  const userID = req.session.user_id;
  if (!userID) {
    res.statusCode = 400;
    const templateVars = {
      user: null,
      message: 'You are not logged in.',
    };
    res.render('400', templateVars);
    return;
  }
  const shortURL = req.params.id;
  const url = urlDatabase[shortURL];
  const ownerIsLoggedIn = url.userID === userID;
  if (ownerIsLoggedIn) {
    const longURL = req.body.newURL;
    urlDatabase[shortURL] = {
      longURL,
      userID,
    };
  }
  res.redirect('/urls');
});
/// POST to /login only if existing user with valid email and password
app.post('/login', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const user = getUserByEmail(email, users);
  const userID = req.session.user_id;
  const templateVars = { user: users[userID] };
  if (!user) {
    res.statusCode = 403;
    templateVars.message = "Sorry, that email isn't registered.";
    res.render('403', templateVars);
  } else if (!bcrypt.compareSync(password, users[user.password])) {
    res.statusCode = 403;
    templateVars.message = 'Incorrect email and/or password.';
    res.render('403', templateVars);
  } else {
    req.session.user_id = user.id;
    res.redirect('/urls');
  }
});
/// POST to /logout and destroy session cookie
app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/urls');
});
/// POST to /register only if new user with valid email and password
app.post('/register', (req, res) => {
  const user = {
    id: generateRandomString(),
    email: req.body.email,
    password: req.body.password,
  };
  const userID = req.session.user_id;
  const templateVars = { user: users[userID] };
  if (user.email === '' || user.password === '') {
    res.statusCode = 400;
    templateVars.message = 'Email and/or password was blank. Please try again.';
    res.render('400', templateVars);
  } else if (getUserByEmail(user.email, users)) {
    res.statusCode = 400;
    templateVars.message = 'Sorry, that email is already registered.';
    res.render('400', templateVars);
  } else {
    users[user.id] = user;
    req.session.user_id = user.id;
    users[user.password] = bcrypt.hashSync(req.body.password, saltRounds);
    res.redirect('/urls');
  }
});
/// END OF ROUTES ///
/// Check that server is running properly
app.listen(PORT, () => {
  // console.log(`TinyApp listening on port ${PORT}!`);
});
