'use strict';

// Variables
// ------------------------------------------------------------ \\

var express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    session = require('express-session'),
    redis = require('connect-redis'),
    models = require('../models'),
    RedisStore = redis(session);



// Set Functions
// ------------------------------------------------------------ //

app.set('views', './views');
app.set('view engine', 'pug');


// Use Functions
// ------------------------------------------------------------ //

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(cookieParser());

// Sesssion Functions
app.use(session({
  secret: 'Shhhhh!',
  resave: false,
  saveUninitialized: true,
  store: new RedisStore()
}));

app.use(function(request, response, next) {
  if (request.session.flash_message) {
    response.locals.flash_message = request.session.flash_message;
    delete request.session.flash_message;
    request.session.save(function() {
      next();
    });
  } else {
    next();
  }
});

// Not clear on this function - It may be why mine is breaking?
app.use(function(request, response, next) {
    if (request.session.user_id) {
        response.locals.user_id = request.session.user_id;
    }
    next();
});

// Helper Functions
// ------------------------------------------------------------ //

function redirectToTask(response, task) {
  response.redirect('/tasks/' + task.id);
}


// Server Tasks
// ------------------------------------------------------------ //

app.get("/", function(request, response) {
  response.render('index');
});

// Lists Tasks
app.get('/tasks', function(request, response) {
  models.Task.findAll()
    .then(function(tasks) {
      response.render('tasks/tasks', { tasks: tasks });
    });
});

// Creates a Task Detail page
app.get('/tasks/:task_id', function(request, response) {
  console.log(request.session);
  models.Task.findById(request.params.task_id)
    .then(function(task) {
      response.render('tasks/task', { task: task });
    });
});

// Function update existing task
app.post('/tasks/:task_id', function(request, response) {
  models.Task.findById(request.params.task_id)
    .then(function(task) {
      task.name = request.body.todo;
      return task.save();
    }).then(function (task) {
      request.session.flash_message = "Updated successfully!";
      redirectToTask(response, task);
    });
});

// Function to create a new task
app.post('/tasks', function(request, response) {
  models.Task.create({ name: request.body.todo })
    .then(function(task) {
      request.session.flash_message = "Added task " + task.name + " successfully!";
      request.session.save(function() {
        response.redirect("/tasks");
      })
    })
});


// User Functions
// ------------------------------------------------------------ //

// List users
app.get('/users', function(request, response) {
  models.User.findAll()
    .then(function(users) {
      response.render('users/users', { users: users });
    });
});

// Create users page
app.get('/users/new-user', function(request, response) {
  response.render('users/register', {title:"Create User"});
});

// Function that adds users to database
app.post('/users/new-user', function(request, response) {
  models.User.create({
    name: request.body.name,
    username: request.body.username,
    password: request.body.password
  })
  .then(function(user) {
    request.session.flash_message = "Added User " + user.name + " successfully!";
    request.session.save(function() {
      response.redirect("/users");
    })
  })
});

// Renders Login page
app.get('/users/login', function(request,response){
  response.render('users/login', {title: 'Login'})
});

// Executes Login function
app.post('/users/login', function(request,response){
  models.User.findOne({
    where: {username: request.body.username.trim()}
  })
  .then(function(user){
    if (user == null){
      console.log("User not found");
      request.session.flash_message = 'User name could not be found.';
      response.redirect('/users/login');
    } else if (user.password != request.body.password){
      console.log('Found "' + user.name + '" but password was incorrect.');
      request.session.flash_message = 'Incorrect username or password.';
      response.redirect('/users/login');
    } else {
      console.log("Login successful for " + user.name);
      request.session.flash_message = 'Welcome ' + user.name;
      request.session.user_id = user.id;
      response.redirect('/users/' + user.id);
    }
  })
});

// Logout User
app.get('/users/logout', function(request,response){
  request.session.flash_message = "You have logged Out, login again.";
  request.session.user_id = null;
  response.redirect('/users/login');
});

// List User Details
app.get('/users/:user_id', function(request,response){
  if (request.session.user_id == request.params.user_id) {
    console.log("User is logged in");
    models.User.findOne({
      where: {id: request.params.user_id}
    })
    .then(function(user){
      response.render('users/detail', { user:user });
    });
  } else {
    console.log("Not Logged in: \n" + request.session);
    response.render('errors', { error:'You must be logged in to see this.'});
  }
});


/*
// updates user information
app.post('/users/:user_id', function(request, response) {
  models.User.findById(request.params.user_id)
    .then(function(user) {
      user.name = request.body.name,
      user.username = request.body.username,
      user.password = request.body.password;
      return user.save();
      console.log("Updating User");
      console.log(request.session);
    }).then(function(user) {
      request.session.flash_message =  "Updated User " + user.name + " successfully!";
      response.redirect("/users/" + user.id);
    });
});
*/

// allow other modules to use the server
module.exports = app;
