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
var allCourses = ''
var allSubjects = ''
var allInfo = ''
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
  courseList.getCourses(function(data) {
    allCourses = data[0];
    allSubjects = data[1];
    allInfo = data[2];
    res.render('pages/index', {
      'courses': [],
      'allCourses': allCourses,
      'allSubjects': allSubjects
    });

  })
});
var currentTime;
app.post("/process", function(req,res) {
  preprocessor.preprocess(req.body.courses, function(result) {
    currentTime = [_.flatten(result.times)];
    res.send(result);
  });
});

app.post("/getInfo", function (req,res) {
  vals = [];
  console.log(req.body.courses)
  courses = req.body.courses.split(",")
  console.log(courses)
  for (course in courses) {
    pos = allCourses.indexOf(courses[course])
    vals.push(allInfo[pos].split(" //// ")[0])
  }
  res.send(vals)
})

app.post("/attempt",  function(req,res) {
  courses = req.body.courses;
  attempts = [];
  console.log(allCourses)
  neededCourses = allCourses.filter(function(x) {
    return x.substr(0,4) == req.body.subjectFilter & x[5] >= req.body.lowerBound & x[5] <= req.body.upperBound;
  });
  attempts = neededCourses;
  success = [];
  done = 0;
  for (x in attempts) {
    courses.push(attempts[x]);
    preprocessor.preprocess(courses,function(result) {
      names = result.names.split('and ');
      thecoursename = names[names.length - 1];
      done += 1;
      if (result.complete) {
        console.log(thecoursename);
        pos = allCourses.indexOf(thecoursename)
        success.push(allInfo[pos].split(" //// ")[0])
        //success.push(thecoursename);
      }
      if (done == attempts.length) {
        res.send(success);
      }
    })
    courses.pop();
  }
})
/* magic: do not sneeze in its presence */
app.get("/preprocessTest", function(req, res) {
  testPreprocessor.preprocess(["MATH 2352", "COMP 1022P"], function(result) {
    res.send(result);
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
