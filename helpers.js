const getUserByEmail = function (submittedEmail, usersDatabase) {
  for (const userID of Object.keys(usersDatabase)) {
    if (submittedEmail === usersDatabase[userID].email) {
      return usersDatabase[userID];
    }
  }
};

module.exports = { getUserByEmail };
