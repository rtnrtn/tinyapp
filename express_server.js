const express = require("express");
const app = express();
const PORT = 8080;
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const { getUserByEmail } = require("./helpers");

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(cookieSession({
  name: 'session',
  keys: ['randomstring', 'anotherrandomstring']
}));

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
};

const generateRandomString = function() {
  let randomString = Math.random().toString(36).slice(2, 8);
  return randomString;
};

const urlDatabase = {
  "b2xVn2": { longURL: "http://www.lighthouselabs.ca", userID: "userRandomID" },
  "9sm5xK": { longURL: "http://www.google.com", userID: "user2RandomID" }
};

const urlsForUser = function(id) {
  let urlsForUserID = {};
  for (let key of Object.keys(urlDatabase)) {
    let value = urlDatabase[key];
    if (value.userID === id) {
      urlsForUserID[key] = value;
    }
  }
  return urlsForUserID;
};

/// ROUTES ///
app.get("/", (req, res) => {
  let userID = req.session["user_id"];
  if (!userID) {
    res.redirect("/login");
  } else {
    res.redirect("/urls");
  }
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls", (req, res) => {
  let userID = req.session["user_id"];
  let templateVars = {
    user: users[userID],
    urls: urlsForUser(userID)
  };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  let userID = req.session["user_id"];
  let templateVars = { user: users[userID] };
  if (!userID) {
    res.redirect("/login");
  } else {
    res.render("urls_new", templateVars);
  }
});

app.get("/urls/:shortURL", (req, res) => {
  let shortURL = req.params.shortURL;
  let url = urlDatabase[shortURL];
  let userID = req.session["user_id"];
  let templateVars = { user: users[userID] };
  if (!url) {
    res.statusCode = 404;
    res.render("404", templateVars);
    return;
  }
  templateVars.ownerIsLoggedIn = url.userID === userID;
  if (templateVars.ownerIsLoggedIn) {
    templateVars.shortURL = shortURL;
    templateVars.longURL = urlDatabase[shortURL].longURL;
  }
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  let shortURL = req.params.shortURL;
  let url = urlDatabase[shortURL];
  let userID = req.session["user_id"];
  let templateVars = { user: users[userID] };
  if (!url) {
    res.statusCode = 404;
    res.render("404", templateVars);
    return;
  }
  let longURL = url.longURL;
  if (!longURL) {
    res.statusCode = 404;
    res.render("404", templateVars);
  } else {
    res.redirect(longURL);
  }
});

app.get("/register", (req, res) => {
  let userID = req.session["user_id"];
  let templateVars = { user: users[userID] };
  if (!userID) {
    res.render("register", templateVars);
  } else {
    res.redirect("/urls");
  }
});

app.get("/login", (req, res) => {
  let userID = req.session["user_id"];
  let templateVars = { user: users[userID] };
  if (!userID) {
    res.render("login", templateVars);
  } else {
    res.redirect("/urls");
  }
});

app.post("/urls", (req, res) => {
  let userID = req.session["user_id"];
  let longURL = req.body.longURL;
  let shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL: longURL,
    userID: userID
  };
  res.redirect(`/urls/${shortURL}`);
});

app.post("/urls/:shortURL/delete", (req, res) => {
  let userID = req.session["user_id"];
  let shortURL = req.params.shortURL;
  let url = urlDatabase[shortURL];
  let ownerIsLoggedIn = url.userID === userID;
  if (ownerIsLoggedIn) {
    delete urlDatabase[shortURL];
  }
  res.redirect("/urls");
});

app.post("/urls/:id", (req, res) => {
  let userID = req.session["user_id"];
  let shortURL = req.params.id;
  let url = urlDatabase[shortURL];
  let ownerIsLoggedIn = url.userID === userID;
  if (ownerIsLoggedIn) {
    let longURL = req.body.newURL;
    urlDatabase[shortURL] = {
      longURL: longURL,
      userID: userID
    };
  }
  res.redirect("/urls");
});

app.post("/login", (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  let user = getUserByEmail(email, users);
  let userID = req.session["user_id"];
  let templateVars = { user: users[userID] };
  if (!user) {
    res.statusCode = 403;
    templateVars.message = "Sorry, that email isn't registered.";
    res.render("403", templateVars);
  } else if (!bcrypt.compareSync(password, users[user.password])) {
    res.statusCode = 403;
    templateVars.message = "Incorrect email and/or password.";
    res.render("403", templateVars);
  } else {
    req.session["user_id"] = user.id;
    res.redirect("/urls");
  }
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/urls");
});

app.post("/register", (req, res) => {
  let user = {
    id: generateRandomString(),
    email: req.body.email,
    password: req.body.password,
  };
  let userID = req.session["user_id"];
  let templateVars = { user: users[userID] };
  if (user.email === "" || user.password === "") {
    res.statusCode = 400;
    templateVars.message = "Email and/or password was blank. Please try again.";
    res.render("400", templateVars);
  } else if (getUserByEmail(user.email, users)) {
    res.statusCode = 400;
    templateVars.message = "Sorry, that email is already registered.";
    res.render("400", templateVars);
  } else {
    users[user.id] = user;
    req.session["user_id"] = user.id;
    users[user.password] = bcrypt.hashSync(req.body.password, saltRounds);
    res.redirect("/urls");
  }
});
/// END OF ROUTES ///
app.listen(PORT, () => {
  console.log(`TinyApp listening on port ${PORT}!`);
});