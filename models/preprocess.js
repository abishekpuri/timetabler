/**
 * @module Preprocess
 */

var https = require('https');
var request = require("request");

function preprocess(courses, callback) {
  var coursePairs = [];
  var subjects = new Set();
  // step 1: generate course pairs of the form [subject, code]
  // step 2: create a set of subjects whose pages need to be fetched
  for (var i = 0; i < courses.length; ++i) {
    var currentCourse = courses[i].split(' ');
    coursePairs.push(currentCourse);
    subjects.add(currentCourse[0]);
  }

  var subjectDoms = {};
  // step 3: get HTML for each subject
  function getDom(subject, value, set) {
    request("https://w5.ab.ust.hk/wcq/cgi-bin/1530/subject/MATH/",
    function(error, response, body) {
      subjectDoms[subject] = body;
    });
  }
  subjects.forEach(getDom);
}

module.exports = {
  "preprocess": preprocess
};
