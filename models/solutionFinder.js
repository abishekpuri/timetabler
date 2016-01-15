/**
 * @module solutionFinder
 */

var _ = require('underscore');

module.exports = {
  isSchedule : function isSchedule(courses) {
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
}
