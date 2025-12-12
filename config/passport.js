const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const db = require('./database');

module.exports = function (passport) {
  passport.use(new LocalStrategy({ usernameField: 'username' }, async (username, password, done) => {
    try {
      const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

      if (rows.length === 0) {
        return done(null, false, { message: 'That username is not registered' });
      }

      const user = rows[0];

      // Match password
      // Note: In the seed script, we might have plain text or hashed. 
      // For production, always use hash. 
      // Here we assume the password in DB is hashed.

      const isMatch = await bcrypt.compare(password, user.password);

      if (isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Password incorrect' });
      }
    } catch (err) {
      console.error(err);
      return done(err);
    }
  }));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
      done(null, rows[0]);
    } catch (err) {
      done(err, null);
    }
  });
};
