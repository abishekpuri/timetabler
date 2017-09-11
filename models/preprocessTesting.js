/**
 * @module Preprocess Testing (modifying might require fighting dragons)
 */

var https = require('https');
var request = require("request");
var cheerio = require("cheerio");

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
    request("https://w5.ab.ust.hk/wcq/cgi-bin/1710/subject/" + subject,
    function(error, response, body) {
      ++counter;
      subjectDoms[subject] = body;
      if (counter === subjects.size) {
        parseDoms(subjectDoms, courses, callback);
      }
    });
  }
  for (var j of subjects) {
    getDom(j);
  }
}

function parseDoms(subjectDoms, requestedCourses, callback) {
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
      if (!new RegExp(requestedCourses.join("|")).test(courseName)) {
        return;
      }
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
      var courseSections = {
        lectureSections: {},
        tutorialSections:{},
        labSections:{}
      };

      // this stores the course section table
      var courseSectionData =
        $(this).children(".sections").children("tr.sectodd, tr.secteven");
      // These variables keep track of how many of each type there are
      for (var i = 0; i < courseSectionData.length; ++i) {
        // current section code is stored so that if we are iterating
        // a row that is not a new section, the time parsed from
        // that row can be appended to the array from the current
        // section.
        var currentSectionCode;
        var sectionTime;
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
          // section times are stored in the second <td> if the current
          // row is a new section
          sectionTime =
            courseSectionData.eq(i).children("td").eq(1).text();
          if (sectionTime === "TBA") {
            continue;
          }
          if(currentSectionCode.indexOf('T') != -1) {
            courseSections.tutorialSections[currentSectionCode] = [sectionTime];
          } else if(currentSectionCode.indexOf('L') != -1) {
            if(currentSectionCode.indexOf('A') != -1) {
              courseSections.labSections[currentSectionCode] = [sectionTime];
            }
            else {
              courseSections.lectureSections[currentSectionCode] = [sectionTime];
            }
          }

        } else {
          // if the row does not contain the newsect class, this means
          // that the time parsed from this row belongs to the section
          // that is currently being parsed.

          // lecture times are stored in the first <td> if the current
          // row is not a new section
          sectionTime =
            courseSectionData.eq(i).children("td").eq(0).text();
          if (sectionTime === "TBA") {
            continue;
          }
          if(currentSectionCode.indexOf('T') != -1) {
            courseSections.tutorialSections[currentSectionCode]
              .push(sectionTime);
          } else if(currentSectionCode.indexOf('L') != -1) {
            if(currentSectionCode.indexOf('A') != -1) {
              courseSections.labSections[currentSectionCode]
                .push(sectionTime);
            }
            else {
              courseSections.lectureSections[currentSectionCode]
                .push(sectionTime);
            }
          }
        }
      }

      // process all the times of each section, so they are split into 30
      // minute intervals with the day of the week attached, eg. Mo 15:00
      // For example, a course with a time MoWe 03:00PM - 04:20PM will
      // be processed into:
      // ["Mo 15:00", "Mo 15:30", "Mo 16:00", "We 15:00", "We 15:30", "We 16:00"]

      for (var lectureSection in courseSections.lectureSections) {
        if (courseSections.lectureSections.hasOwnProperty(lectureSection)) {
          courseSections.lectureSections[lectureSection] =
            processIntoTimeIntervals(courseSections.lectureSections[lectureSection]);
        }
      }
      for (var tutorialSection in courseSections.tutorialSections) {
        courseSections.tutorialSections[tutorialSection] =
          processIntoTimeIntervals(courseSections.tutorialSections[tutorialSection]);
      }
      for (var labSection in courseSections.labSections) {
        courseSections.labSections[labSection] =
          processIntoTimeIntervals(courseSections.labSections[labSection]);
      }
      courses[courseName].sections = courseSections;
    });
  }
  callback(courses);
}

function processIntoTimeIntervals(timeArray) {
  var returnArray = [];

  for (var i = 0; i < timeArray.length; ++i) {
    var timeIntervalString = timeArray[i];
    var daysOfWeekArray = [];
    var daysOfWeek =
      timeIntervalString.substr(0, timeIntervalString.indexOf(" "));
    while (daysOfWeek.length !== 0) {
      daysOfWeekArray.push(daysOfWeek.substr(0, 2));
      daysOfWeek = daysOfWeek.substr(2);
    }
    var timeInterval =
      timeIntervalString.substr(timeIntervalString.indexOf(" ") + 1);
    var startTime = timeInterval.substr(0, timeInterval.indexOf(" "));
    var endTime = timeInterval.substr(timeInterval.lastIndexOf(" ") + 1);
    var timeIntervalArray = parseTime(startTime, endTime);

    // cartesian product
    for (var j = 0; j < daysOfWeekArray.length; ++j) {
      for (var k = 0; k < timeIntervalArray.length; ++k) {
        returnArray.push(daysOfWeekArray[j] + " " + timeIntervalArray[k]);
      }
    }
  }
  return returnArray;
}

function parseTime(startTime, endTime) {
  function processTime(time) {
    var hour = parseInt(time.substr(0, 2), 10);
    var minute = parseInt(time.substr(3, 5), 10);
    if (startTime.substr(5) === "PM" && hour < 12) {
      hour += 12;
    }
    return {
      "hour": hour,
      "minute": minute
    };
  }
  var start = processTime(startTime);
  var end = processTime(endTime);

  var parsedTimes = [];
  while (start.hour < end.hour ||
    (start.hour === end.hour && start.minute < end.minute)) {
    console.log("Start time: ", start);
    console.log("End time: ", end);
    parsedTimes.push(timeToString(start));
    if (start.minute !== 30) {
      start.minute = 30;
    } else {
      start.hour += 1;
      start.minute = 0;
    }
  }
  return parsedTimes;
}

function timeToString(time) {
  var hour = time.hour.toString();
  var minute = time.minute.toString();
  while (hour.length < 2) {
    hour = "0" + hour;
  }
  while (minute.length < 2) {
    minute = "0" + minute;
  }
  return hour + ":" + minute;
}

module.exports = {
  "preprocess": preprocess
};
