const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const MongoStore = require('connect-mongo');
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const router = express.Router();
const Bot = require('./models/bot');
const User = require('./models/user');
const app = express();
const conf = require('./config.json'); // make sure you rename config.example.json to config.json and fill in the values. 



// Connect to MongoDB
const clientPromise = mongoose.connect(conf.mongourl, {
    useNewUrlParser: true, 
    useUnifiedTopology: true
}).then(mongoose => mongoose.connection.getClient());

//random session secret generator out of random characters
const sessionSecret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Express and middleware setup
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
    secret: sessionSecret,
    resave: true,
    saveUninitialized: false,
    store: MongoStore.create({ clientPromise })
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
    async function(username, password, done) {
      try {
        // Add your own logic here to authenticate the user
        // For example, query the database to find the user by username
        const user = await User.findOne({ username });
  
        // If the user is not found or the password is incorrect, return error
        if (!user || !user.verifyPassword(password)) {
          return done(null, false, { message: 'Invalid username or password' });
        }
        
  
        // If authentication succeeds, return the user object
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
));

//create user.VeryfyPassword
User.prototype.verifyPassword = async function(password) {
    try {
        const result = await bcrypt.compare(password, this.password);
        return result;
    } catch (error) {
        console.log(error);
        return false;
    }
};

// Serialize the user object
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

// Deserialize the user object
passport.deserializeUser(async function(id, done) {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});


app.set('view engine', 'ejs');


// Home page
router.get('/', async (req, res) => {
    try {
      const bots = await Bot.find(); // Retrieve all bots
      const user = req.user; // Get the logged-in user data
  
      res.render('index', { bots, user }); // Pass the bots and user data to the view
    } catch (err) {
      console.log(err);
      res.status(500).send('An error occurred');
    }
});
  
  

router.get('/search', (req, res) => {
    const searchTerm = req.query.q;
    const user = req.user;
    Bot.find({ name: new RegExp(searchTerm, 'i') })
      .then(bots => {
        res.render('index', { bots: bots, user });
      })
      .catch(err => {
        console.log(err);
        res.status(500).send('An error occurred while fetching bots.');
      });
});
    

// Login page
router.get('/login', (req, res) => {
  res.render('login');
});

// Registration page
router.get('/register', (req, res) => {
  res.render('register');
});


// Logout
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

// Add bot page
router.get('/botsignup', (req, res) => {
  // TODO: Render add bot page
  res.render('add');
});

// Bot details page
router.get('/api/v1/bots/:botId', async (req, res) => {
    const botId = req.params.botId;
  
    try {
      // Use Mongoose to find the bot in the database
      const bot = await Bot.findById(botId);
      
      // If the bot was not found, send a 404 response
      if (!bot) {
        res.status(404).json({ message: 'Bot not found' });
      } else {
        // If the bot was found, render the 'bot' view with the bot's data
        res.render('bot', { bot: bot });
      }
    } catch (error) {
      // If an error occurred while querying the database, send a 500 response
      res.status(500).json({ message: 'An error occurred' });
    }
});
  



// Registration POST
router.post('/api/v1/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if a user with the same username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: 'Username is already taken' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const newUser = new User({
      username,
      password: hashedPassword
    });

    // Save the user to the database
    await newUser.save();

    res.redirect('/login');
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});

// Login POST
router.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login'
}));

const authenticateAPIKey = (req, res, next) => {
    //const apiKey = req.header('API-Key');
    //if (!apiKey) {
    //  return res.status(401).json({ error: 'No API key provided.' });
    //}
  //
    //if (apiKey !== process.env.API_KEY) {
    //  return res.status(403).json({ error: 'Invalid API key.' });
    //}
  
    next();
};

  
//Bot adding POST
router.post('/api/v1/addbot', authenticateAPIKey, async (req, res) => {
    const botData = {
      name: "Example Bot 1",
      description: "This is an example bot 1",
      imageURL: "https://i.imgur.com/Bl0jjby.jpeg",
      author: "Example Author 1",
      invite: "https://discord.com/api/oauth2/authorize?client_id=123456789&permissions=0&scope=bot"
    };

    try {
      const bot = new Bot(botData);
      const result = await bot.save();
      res.send(result);
    } catch (err) {
      console.log(err);
      res.status(500).send('An error occurred');
    }
});

  
  


// Export our router
module.exports = router;

app.use('/', router);
app.listen(3000, () => console.log('Server listening on port 3000.'));
