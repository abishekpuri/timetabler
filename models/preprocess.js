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
  // this stores the parsed courses
  // format is as follows
  // {
  //   "isMatching": (boolean),
  //   "sections": (a course section object - see below)
  // }

  function parseDoms() {
    var courses = {}
    for (var key in subjectDoms) {
      var $ = cheerio.load(subjectDoms[key]);
      $(".course").each(function(index, elem) {
        var current = $(this);
        var courseName = $(this).children("h2").text();
        courses[courseName] = {};
        if ($(this).children(".courseinfo").find(".matching").length) {
          courses[courseName].isMatching = true;
        } else {
          courses[courseName].isMatching = false;
        }
        // this stores the parsed course sections
        // format is as follows:
        // {
        //   "L1": [time1, time2],
        //   "L2": [time1],
        //   "T1": [time1]
        // }
        var courseSections = {};
        // this stores the course section table
        var courseSectionData =
          $(this).children(".sections").children("tr.sectodd, tr.secteven");

        for (var i = 0; i < courseSectionData.length; ++i) {
          // current section code is stored so that if we are iterating
          // a row that is not a new section, the time parsed from
          // that row can be appended to the array from the current
          // section.
          var currentSectionCode;
          if (courseSectionData.eq(i).hasClass("newsect")) {
            // the newsect class is a row that denotes a new section

            // stores the raw course section from the HTML
            var courseSectionString =
              courseSectionData.eq(i).children("td").eq(0).text();

            // substring code deletes the course number from the
            // section code string.
            currentSectionCode =
              courseSectionString.substring(0,
                courseSectionString.lastIndexOf(" "));

            // lecture times are stored in the second <td> if the current
            // row is a new section
            var lectureTime =
              courseSectionData.eq(i).children("td").eq(1).text();
            courseSections[currentSectionCode] = [lectureTime];
          } else {
            // if the row does not contain the newsect class, this means
            // that the time parsed from this row belongs to the section
            // that is currently being parsed.

            // lecture times are stored in the first <td> if the current
            // row is not a new section
            var lectureTime =
              courseSectionData.eq(i).children("td").eq(0).text();
            courseSections[currentSectionCode].push(lectureTime);
          }
        }
        courses[courseName].sections = courseSections;
      });
    }
    callback(courses);
  }
}

module.exports = {
  "preprocess": preprocess
};
