const getUserByEmail = function(submittedEmail, usersDatabase) {
  for (let userID of Object.keys(usersDatabase)) {
    if (submittedEmail === usersDatabase[userID].email) {
      return usersDatabase[userID];
    }
  }
};

module.exports = { getUserByEmail };