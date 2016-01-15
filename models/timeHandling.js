module.exports = {
  processIntoTimeIntervals : function processIntoTimeIntervals(timeArray) {
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
      var timeIntervalArray = this.parseTime(startTime, endTime);

      // cartesian product
      for (var j = 0; j < daysOfWeekArray.length; ++j) {
        for (var k = 0; k < timeIntervalArray.length; ++k) {
          returnArray.push(daysOfWeekArray[j] + " " + timeIntervalArray[k]);
        }
      }
    }
    return returnArray;
  },
  parseTime : function parseTime(startTime, endTime) {
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
      parsedTimes.push(this.timeToString(start));
      if (start.minute !== 30) {
        start.minute = 30;
      } else {
        start.hour += 1;
        start.minute = 0;
      }
    }
    return parsedTimes;
  },
  timeToString : function timeToString(time) {
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
}
