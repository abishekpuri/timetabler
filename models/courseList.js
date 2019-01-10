// To get the courses : allcourses.map(a => a.split(" -")[0]);
/* To get the subjects : a = []; allcourses.map(a => a.substr(0,4)).filter(function(course) {
    if(a.indexOf(course) == -1) {
        a.push(course);
        return true;
    } else {
        return false;
    }
});*/
var request = require("request");
var cheerio = require("cheerio");

function getCourses(callback) {
  a = '';
  request('https://w5.ab.ust.hk/wcq/cgi-bin/1830/', function(err,res,body) {
    a = body;
    a = a.split("var allcourses = ")[1]
    a = a.split(';\nvar allinstructors = ')[0]
    a = a.split(",\'")
    allCourses = a.map(b => b.split(" -")[0]);
    allCourses[0] = allCourses[0].split("['")[1];
    c = [];
    allSubjects = a.map(b => b.substr(0,4)).filter(function(course) {
        if(c.indexOf(course) == -1) {
            c.push(course);
            return true;
        } else {
            return false;
        }
    });
    delete allSubjects[0];
    callback([allCourses,allSubjects,a]);
  })
}

module.exports = {
  "getCourses": getCourses,
  "allSubjects": ["ACCT","AESF","BIEN","BIPH","BTEC","CBME","CENG","CHEM","CHMS","CIEM","CIVL","COMP","CPEG","CSIT","ECON","EEMT","EESM","ELEC","ENEG","ENGG","ENTR","ENVR","ENVS","EVNG","EVSM","FINA","GBUS","GNED","HART","HLTH","HMMA","HUMA","IBTM","IDPO","IEDA","IIMP","ISDN","ISOM","JEVE","LABU","LANG","LIFS","MAED","MAFS","MARK","MATH","MECH","MESF","MGCS","MGMT","MILE","MIMT","MSBD","NANO","OCES","PDEV","PHYS","PPOL","RMBI","SBMT","SCIE","SHSS","SOSC","SSMA","SUST","TEMG","UROP"],
  "allCourses": getCourses};
