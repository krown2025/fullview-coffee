const express = require('express');
const session = require('express-session');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const passport = require('passport');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

const subdomainMiddleware = require('./middleware/subdomain');
const db = require('./config/database');

// Passport Config
require('./config/passport')(passport);

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// View Engine
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Body Parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Load Translations
const fs = require('fs');
const translations = {
  en: JSON.parse(fs.readFileSync(path.join(__dirname, 'locales', 'en.json'), 'utf8')),
  ar: JSON.parse(fs.readFileSync(path.join(__dirname, 'locales', 'ar.json'), 'utf8'))
};

// Global Variables & Language Detection
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;

  // Language Detection
  const lang = req.acceptsLanguages('ar', 'en') || 'ar';
  res.locals.lang = lang;
  if (lang === 'ar') {
    res.locals.dir = 'rtl';
    res.locals.isRTL = true;
  } else {
    res.locals.dir = 'ltr';
    res.locals.isRTL = false;
  }

  // Translation Helper
  res.locals.__ = function (key) {
    return translations[lang][key] || key;
  };

  next();
});

// Subdomain Middleware
app.use(subdomainMiddleware);

// Routes
app.use('/admin', require('./routes/admin'));
app.use('/branch', require('./routes/branch'));
app.use('/kds', require('./routes/kds'));
app.use('/', require('./routes/index'));

// Socket.io
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('joinBranch', (branchId) => {
    socket.join(`branch_${branchId}`);
    console.log(`Socket joined branch_${branchId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Make io accessible in routes
app.set('io', io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
