/**
 * @module Preprocess
 */

var https = require('https');
var request = require("request");
var cheerio = require("cheerio");
var _ = require('underscore');

/* jshint esnext: true */
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

function isSchedule(courses) {
  function f(c,d,s,i) {
    if(c==0 && d >=courses[c].length){
      return 'No Solution';
    }
    if(d >=courses[c].length) {
      //Remove the previous steps value
      s.pop(s.indexOf(courses[c-1][i[c-1]]));
      marker = i[c-1] + 1
      i[c-1] = 0
      return f(c-1,marker,s,i);
    }
    if(noConflict(s,courses[c][d])) {
      s.push(courses[c][d]);
      i[c] = d;
      if(s.length == i.length) {
        return s;
      }
      else {
        return f(c+1,0,s,i);
      }
    }
    else {
        return f(c,d+1,s,i);
    }
  }
  function noConflict(p,q) {
    for ( var val in p) {
      if(_.union(p[val],q).length != (p[val].length + q.length)) {
        return false;
      }
    }
    return true;
  }
  var i = [];
  for (var q in courses) {
    i.push(0);
  }
  var a = f(0,0,[],i);
  if(a.length != i.length) {
    return {'timeSlots':a,'complete':false};
  }
  else {
    return {'timeSlots':a,'complete':true};
  }
}
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
      courseTimes = [];
      numLecs = courses[i].numLecs;
      numTuts = (courses[i].numTuts === 0)?courses[i].numLabs:courses[i].numTuts;
      for (var j = 0; j < numLecs; ++j) {
        var courseStr = courses[i].sections[Object.keys(courses[i].sections)[j]];
        for(var k = numLecs; k < (numTuts + numLecs); ++k) {
          //Need to develop bit more to accomodate matching tutorials
          if(courses[i].isMatching && k!=(j+numLecs)) {
            continue;
          }
          courseStrTemp = courseStr + ' and ';
          courseStrTemp += courses[i].sections[Object.keys(courses[i].sections)[k]];
          courseTimes.push(courseStrTemp);
        }
        if (numTuts === 0) {
          courseStrTemp = courseStr +' ';
          courseTimes.push(courseStrTemp.substr(0,courseStrTemp.length -1));
        }
      }
      allTimes.push(courseTimes);
    }
    names = names.substr(0,names.length - 5);

    // THis is the hauton borrowed implementation (ty hauton)
    for (var i in allTimes) {
      for (var k in allTimes[i]) {
        allTimes[i][k] = allTimes[i][k].split(' and ');
        allTimes[i][k] = processIntoTimeIntervals(allTimes[i][k]);
      }
    }
    var solution = isSchedule(allTimes);
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
