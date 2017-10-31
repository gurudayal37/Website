const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const async=require('async');
const nodemailer=require('nodemailer');
const crypto=require('crypto');

let User = require('../models/user');

router.get('/register', function(req, res){
  res.render('register');
});

router.post('/register', function(req, res){
  const name = req.body.name;
  const email = req.body.email;
  const username = req.body.username;
  const password = req.body.password;
  const password2 = req.body.password2;

  req.checkBody('name', 'Name is required').notEmpty();
  req.checkBody('email', 'Email is required').notEmpty();
  req.checkBody('email', 'Email is not valid').isEmail();
  req.checkBody('username', 'Username is required').notEmpty();
  req.checkBody('password', 'Password is required').notEmpty();
  req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

  let errors = req.validationErrors();

  if(errors){
    res.render('register', {
      errors:errors
    });
  } else {
    let newUser = new User({
      name:name,
      email:email,
      username:username,
      password:password
    });

    bcrypt.genSalt(10, function(err, salt){
      bcrypt.hash(newUser.password, salt, function(err, hash){
        if(err){
          console.log(err);
        }
        newUser.password = hash;
        newUser.save(function(err){
          if(err){
            console.log(err);
            return;
          } else {
            req.flash('success','You are now registered and can log in');
            res.redirect('/users/login');
          }
        });
      });
    });
  }
});

router.get('/login', function(req, res){
  res.render('login');
});

router.post('/login', function(req, res, next){
  passport.authenticate('local', {
    successRedirect:'/',
    failureRedirect:'/users/login',
    failureFlash: true
  })(req, res, next);
});

router.get('/logout', function(req, res){
  req.logout();
  req.flash('success', 'You are logged out');
  res.redirect('/users/login');
});

router.get('/forgot',(req,res)=>{
  res.render('forgot');
});

router.post('/forgot',(req,res,next)=>{
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token,done){
      User.findOne({email:req.body.email},function(err,user){
        if(!user){
          req.flash('danger', `No account with ${req.body.email} exists.`);
          return res.redirect('/users/forgot');
        }
        user.resetPasswordToken=token;
        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token,user,done){
      var transport=nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: 'codingurus22@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'codingurus22@gmail.com',
        subject: 'Password change for your account on codingurus.herokuapp.com',
        text:'Hi '+user.name+',\n'+
          'We got a request to reset your CodingGurus password.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/users/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email\n'
      };
      transport.sendMail(mailOptions, function(err) {
        if(err){
          return console.log(err);
        }
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ],(err)=>{
      res.redirect('/users/forgot');
  });
});

router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token}, function(err, user) {
    if (!user) {
      req.flash('error', 'Could not reset password . Please try again');
      return res.redirect('/users/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token}, function(err, user){
        if (!user) {
          req.flash('danger', 'Could not reset password . Please try again');
          return res.redirect('/users/forgot');
        }
        if(req.body.password === req.body.confirm) {
          bcrypt.genSalt(10,function(err,salt){
            bcrypt.hash(req.body.password,salt,function(err,hash){
              let query={_id:user._id};
              user.password=hash;
              user.resetPasswordToken="";
              User.update(query,user,function(err){
                done(err,user);
              });
            });
          });
        }
        else {
            req.flash("danger", "Passwords do not match.");
            return res.redirect('/users/reset/'+req.params.token);
        }
      });
    },
    function(user, done) {
      var transport = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: 'codingurus22@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'codingurus22@gmail.com',
        subject: 'Password change for your account on codingurus.herokuapp.com',
        text:'Hi '+user.name+',\n'+
          'Your password for CodingGurus account has been changed successfully.'
      };
      transport.sendMail(mailOptions, function(err) {
        console.log('mail sent for password change');
        req.flash('success', 'Your password has been changed successfully. Please log in to continue.');
        done(err, 'done');
      });
    }
  ], function(err) {
    res.redirect('/users/login');
  });
});

module.exports = router;
