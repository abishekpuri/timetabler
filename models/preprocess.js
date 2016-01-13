/**
 * @module Preprocess
 */

var https = require('https');
var request = require("request");
var cheerio = require("cheerio");

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
  var counter = 0;

  // step 3: get HTML for each subject
  function getDom(subject) {
    request("https://w5.ab.ust.hk/wcq/cgi-bin/1530/subject/" + subject,
    function(error, response, body) {
      ++counter;
      subjectDoms[subject] = body;
      if (counter === subjects.size) {
        parseDoms();
      }
    });
  }

  for (var i of subjects) {
    getDom(i);
  }

  function parseDoms() {
    parsedDoms = [];
    for (var key in subjectDoms) {
      var $ = cheerio.load(subjectDoms[key]);
      $(".course").each(function() {
        var name = $(this).find('h2').text();
        for(i = 0;i < coursePairs.length;++i) {
          if(name.indexOf(coursePairs[i][1])!= -1) {
            var courseName = coursePairs[i][0] + coursePairs[i][1];
            $(this).find($('.sections')).children($('.newsect')).each(function() {
              // This gives the form MATH2352 L1 (3118)TuTh 01:30PM - 02:50PM
              parsedDoms.push(courseName + ' '+ $(this)
              .children("td:nth-child(-n+2)").text());
            })
            break;
          }
        }
      });
    }
    callback(parsedDoms);
  }
}

module.exports = {
  "preprocess": preprocess
};
