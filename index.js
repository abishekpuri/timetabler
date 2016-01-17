/**
 * @description The index is the entry point of the application.
 * @module index
 */
var express = require("express");
var bodyParser = require("body-parser");

var app = express();

var preprocessor = require("./models/preprocess.js");
var courseList = require("./models/courseList.js");

var testPreprocessor = require("./models/preprocessTesting.js");

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

app.post("/process", function(req,res) {
  preprocessor.preprocess(req.body.courses, function(result) {
    res.send(result);
  });
});

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
