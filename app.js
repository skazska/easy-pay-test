var express = require('express');
var path = require('path');
var logger = require('morgan');
//var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: false }));
//app.use(cookieParser());


//postgres
var PG = require('pg');
var config = {
  pg: {
    host: 'localhost',
    user: 'ska',
    password: '375612',
    database: 'test'
  }
};
var db = new PG.Pool(config.pg);

//add response shortcuts
app.use(function(req, res, next){
  //to set status and response
  res.xSet = function(status, data, contentType, next){
    this.xStatusCode = status;
    this.xContentType = contentType||'application/json';
    this.xData = data;
    if (next && ( typeof next == 'function' )) next();
  };
  next();
});

//routes and controllers
var apiController = require('./controllers/api')(db);
var apiRoutes = require('./routes/api')(apiController);
app.use('/', apiRoutes);

//send json response, actually
app.use(function(req,res,next){
  if (res.xData||res.xStatusCode) {
    if (res.xContentType) {
      res.setHeader('Content-Type', res.xContentType);
      if (res.xContentType == 'application/json'){
        res.end(JSON.stringify(res.xData, null, 2));
      } else {
        res.end(res.xData);
      }
    } else {
      if (res.xData) console.log(res.xStatusCode+' response with no contentType! ');
      next();
    }
  } else {
    next();
  }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 500;//404;
  next(err);
});



// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
//    if (!res.xStatusCode || (res.xStatusCode && res.xStatusCode < 400)) res.statusCode = err.status||500;
    res.statusCode =500;
    res.setHeader('Content-Type', res.xContentType||'text');
    res.end(err.stack);
    next(err);
  });
} else {
// production error handler
  app.use(function(err, req, res, next) {
//    if (!res.xStatusCode || (res.xStatusCode && res.xStatusCode < 400)) res.statusCode = err.status||500;
    res.statusCode =500;
    res.setHeader('Content-Type', 'application/json');
    res.end('{"error": "' + err.message + '"}');
    next(err);
  });

}



module.exports = app;
