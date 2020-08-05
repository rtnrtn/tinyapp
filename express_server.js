const express = require("express");
const app = express();
const PORT = 8080;
const bodyParser = require("body-parser");
const { response } = require("express");
const cookieParser = require("cookie-parser");
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(cookieParser());

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
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const isEmailAlreadyRegistered = function(submittedEmail) {
  for (let i of Object.keys(users)) {
    if (users[i].email === submittedEmail)
      return true;
  }
  return false;
};


/// ROUTES ///
app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls", (req, res) => {
  let userID = req.cookies["user_id"];
  let templateVars = {
    user: users[userID],
    urls: urlDatabase
  };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  let userID = req.cookies["user_id"];
  let templateVars = { user: users[userID] };
  res.render("urls_new", templateVars);
});

app.get("/urls/:shortURL", (req, res) => {
  let shortURL = req.params.shortURL;
  let userID = req.cookies["user_id"];
  let templateVars = {
    user: users[userID],
    shortURL: shortURL,
    longURL: urlDatabase[shortURL]
  };
  res.render("urls_show", templateVars);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/u/:shortURL", (req, res) => {
  let shortURL = req.params.shortURL;
  let longURL = urlDatabase[shortURL];
  let userID = req.cookies["user_id"];
  let templateVars = { user: users[userID] };
  if (!longURL) {
    res.statusCode = 404;
    res.render("404", templateVars);
  } else {
    res.redirect(longURL);
  }
});

app.get("/register", (req, res) => {
  let userID = req.cookies["user_id"];
  let templateVars = { user: users[userID] };
  res.render("register", templateVars);
});

app.get("/login", (req, res) => {
  let userID = req.cookies["user_id"];
  let templateVars = { user: users[userID] };
  res.render("login", templateVars);
});

app.post("/urls", (req, res) => {
  let longURL = req.body.longURL;
  let shortURL = generateRandomString();
  urlDatabase[shortURL] = longURL;
  res.redirect(`/urls/${shortURL}`);
});

app.post("/urls/:shortURL/delete", (req, res) => {
  let shortURL = req.params.shortURL;
  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

app.post("/urls/:id", (req, res) => {
  let shortURL = req.params.id;
  let longURL = req.body.newURL;
  urlDatabase[shortURL] = longURL;
  res.redirect("/urls");
});

app.post("/login", (req, res) => {
  let username = req.body.username;
  res.cookie("username", username);
  res.redirect("/urls");
});

app.post("/logout", (req, res) => {
  let username = req.body.username;
  res.clearCookie("username", username);
  res.redirect("/urls");
});

app.post("/register", (req, res) => {
  let user = {
    id: generateRandomString(),
    email: req.body.email,
    password: req.body.password
  };
  if (user.email === "" || user.password === "" || (isEmailAlreadyRegistered(user.email))) {
    res.statusCode = 400;
    res.send("400 - Bad Request");
  } else {
    users[user.id] = user;
    res.cookie("user_id", user.id);
    res.redirect("/urls");
  }
});
/// END OF ROUTES ///
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});