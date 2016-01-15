/**
 * @module Preprocess
 */

var https = require('https');
var request = require("request");
var cheerio = require("cheerio");
var _ = require('underscore');
var solutionFinder = require('./solutionFinder.js');
var timeHandling = require('./timeHandling.js');

/* jshint esnext: true */
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

  for (var j of subjects) {
    getDom(j);
  }
  function parseDoms() {
    // this stores the parsed courses
    // format is as follows
    // {
    //   "isMatching": (boolean),
    //   "sections": (a course section object - see below)
    // }
    var courses = {};

    /*jshint -W083 */
    for (var key in subjectDoms) {
      var $ = cheerio.load(subjectDoms[key]);
      $(".course").each(function(index, elem) {
        var current = $(this);
        var courseName = $(this).children("h2").text().split('-')[0];
        courseName = courseName.substr(0,courseName.length-1);
        courses[courseName] = {};
        courses[courseName].course = courseName;
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
        // These variables keep track of how many of each type there are
        var numLecs = 0;
        var numTuts = 0;
        var numLabs = 0;
        for (var i = 0; i < courseSectionData.length; ++i) {
          // current section code is stored so that if we are iterating
          // a row that is not a new section, the time parsed from
          // that row can be appended to the array from the current
          // section.
          var currentSectionCode;
          var lectureTime;
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
            // This is to keep a count of how many of each section there are
            // So we can iterate through it properly when matching
            if(currentSectionCode.indexOf('T') != -1) {
              numTuts += 1;
            }
            if(currentSectionCode.indexOf('L') != -1) {
              if(currentSectionCode.indexOf('A') != -1) {
                numLabs += 1;
              }
              else {
                numLecs += 1;
              }
            }
            // lecture times are stored in the second <td> if the current
            // row is a new section
            lectureTime =
              courseSectionData.eq(i).children("td").eq(1).text();
            courseSections[currentSectionCode] = [lectureTime];
          } else {
            // if the row does not contain the newsect class, this means
            // that the time parsed from this row belongs to the section
            // that is currently being parsed.

            // lecture times are stored in the first <td> if the current
            // row is not a new section
            lectureTime =
              courseSectionData.eq(i).children("td").eq(0).text();
            courseSections[currentSectionCode].push(lectureTime);
          }
        }
        courses[courseName].sections = courseSections;
        courses[courseName].numLecs = numLecs;
        courses[courseName].numTuts = numTuts;
        courses[courseName].numLabs = numLabs;
      });
    }
    // Here we can get the data for the courses that were inputted for processing
    selectedCourses = [];
    for(var i = 0; i < coursePairs.length; i++) {
      var name = coursePairs[i][0] + ' ' + coursePairs[i][1];
      selectedCourses.push(courses[name]);
    }
    courses = selectedCourses;
    allTimes = [];
    names = '';

    /* jshint shadow:true */
    for(var i = 0; i < courses.length; ++i) {
      names += courses[i].course + ' and ';
      courseTimesTest = [];
      numLecs = courses[i].numLecs;
      numTuts = (courses[i].numTuts === 0)?courses[i].numLabs:courses[i].numTuts;
      for (var j = 0; j < numLecs; ++j) {
        slotTime = [];
        currentLec = courses[i].sections[Object.keys(courses[i].sections)[j]];
        for (var t in currentLec){
            slotTime.push(currentLec[t])
          }
        for(var k = numLecs; k < (numTuts + numLecs); ++k) {
          currentTut = courses[i].sections[Object.keys(courses[i].sections)[k]];
          //Need to develop bit more to accomodate matching tutorials
          if(courses[i].isMatching && k!=(j+numLecs)) {
            continue;
          }
          slotTimeTemp = [];
          slotTimeTemp.push(currentLec[0]);
          slotTimeTemp.push(currentTut[0]);
          courseTimesTest.push(slotTimeTemp);
        }
        if (numTuts === 0) {
          courseTimesTest.push(slotTime);
        }
      }
      allTimes.push(courseTimesTest);
    }
    names = names.substr(0,names.length - 5);

    // THis is the hauton borrowed implementation (ty hauton)
    for (var i in allTimes) {
      for (var k in allTimes[i]) {
        allTimes[i][k] = timeHandling.processIntoTimeIntervals(allTimes[i][k]);
      }
    }
    var solution = solutionFinder.isSchedule(allTimes);
    // Once the full matching function is made, this will be the callback for it
    callback({
      'complete': solution.complete,
      'times': solution.timeSlots,
      'names':names
    });
  }
}


module.exports = {
  "preprocess": preprocess,
  //This will be where preprocessed courses go to get checked for clashes
};
