const express=require('express');
const path=require('path');
const bodyParser=require('body-parser');
const expressValidator=require('express-validator');
const flash=require('connect-flash');
const session=require('express-session');
const passport=require('passport');

const mongoose=require('./db/mongoose');
const Article=require('./models/article.js');
const User=require('./models/user.js');

const app=express();
const port=process.env.PORT || 3000;

// mongoose.connect(config.database,{useMongoClient: true});
// var db=mongoose.connection;
// db.once('open',function(){
//   console.log('Connected to mongodb');
// });
// db.on('error',function(err){
//   console.log(err);
// });

app.set('views',path.join(__dirname,'views'));
app.set('view engine','pug');

app.use(bodyParser.json({limit: "50mb"}));
app.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit:50000}));

app.use(express.static(path.join(__dirname,'public')));

app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true
}))

app.use(require('connect-flash')());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

require('./config/passport')(passport);

app.use(passport.initialize());
app.use(passport.session());

app.get('*', function(req, res, next){
  res.locals.user = req.user || null;
  next();
});

app.get('/',(req,res)=>{
  Article.find({},(err,articles)=>{
    if(err){
      console.log(err);
    }else{
      res.render('index',{
        title:'Questions',
        articles:articles
      });
    }
  });
});

var articles=require('./routes/articles');
var users=require('./routes/users');
app.use('/articles',articles);
app.use('/users',users);

app.listen(port,()=>{
  console.log(`Server is up on port ${port}`);
});
