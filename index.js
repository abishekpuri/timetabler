/**
 * @description The index is the entry point of the application.
 * @module index
 */
var express = require("express");
var bodyParser = require("body-parser");
var _ = require('underscore');
var app = express();

var preprocessor = require("./models/preprocess.js");
var courseList = require("./models/courseList.js");

var testPreprocessor = require("./models/preprocessTesting.js");
var solutionFinder = require('./models/solutionFinder.js');
/* jshint esnext: true */

/**
 * @summary The default port that node will run on.
 * @constant
 * @default
 */
const DEFAULT_FALLBACK_PORT = 5000;

app.use(express.static(__dirname + "/public"));

// extended = true to support nested JSON objects in requests
// this is utilized extensively for package requests
app.use(bodyParser.urlencoded({ extended: true }));

app.set("port", (process.env.PORT || DEFAULT_FALLBACK_PORT));
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");

app.get("/", function(req, res) {
  var allCourses = courseList.allCourses;
  var allSubjects = courseList.allSubjects;
  res.render('pages/index', {
    'courses': [],
    'allCourses': allCourses,
    'allSubjects': allSubjects
  });
});
var currentTime;
app.post("/process", function(req,res) {
  preprocessor.preprocess(req.body.courses, function(result) {
    res.send(result);
    currentTIme = _.flatten(result.times);
  });
});

/* magic: do not sneeze in its presence */
app.get("/preprocessTest", function(req, res) {
  testPreprocessor.preprocess(["MATH 2352", "COMP 1022P"], function(result) {
    res.send(result);
  });
});

app.get('/available',function(req,res) {
  var courses = courseList.allCourses;
  courses = courses.filter(function(i) {
    return (i.substr(0,4) == 'MATH');
  });
  var myTimes = [];
  myTimes.push(_.flatten(["Mo 10:30","Mo 11:00","Mo 11:30","We 10:30","We 11:00","We 11:30","Th 16:30","Th 17:00","Th 17:30","Th 18:00","Mo 12:00","Mo 12:30","Mo 13:00","We 12:00","We 12:30","We 13:00","Fr 10:30","Fr 11:00","We 15:00","We 15:30","We 16:00","Fr 15:00","Fr 15:30","Fr 16:00","Mo 09:00","Mo 09:30","Mo 10:00","We 09:00","We 09:30","We 10:00","Tu 11:00","Tu 11:30","We 13:30","We 14:00","We 14:30","Fr 13:30","Fr 14:00","Fr 14:30","Tu 16:30","Tu 17:00","Tu 13:30","Tu 14:00","Tu 14:30","Th 13:30","Th 14:00","Th 14:30","Mo 13:30","Mo 14:00"]));
  var list = [];
  preprocessor.preprocess(courses, function(result) {
    for (var i in result.allTimes) {
      var checkArray = [];
      checkArray.push(result.allTimes[i]);
      checkArray.push(myTimes);
      var noConflict = solutionFinder.isSchedule(checkArray).complete;
      if(noConflict) {
        list.push(result.names.split(' and ')[i]);
      }
      if(i == result.allTimes.length - 1) {
        res.send(list);
      }
    }
  });
});
app.use(function(req, res, next) {
  res.status(404);
  res.format({
    "html": function() {
      res.render("pages/404", { url: req.url });
    },
    "json": function() {
      res.json({ error: "Not found" });
    },
    "text":  function() {
      res.send("Not found");
    },
    "default": function() {
      res.status(406).send("Not acceptable");
    }
  });
});

app.listen(app.get("port"), function() {
  console.log("Node app is running on port", app.get("port"));
});
