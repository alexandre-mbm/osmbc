
var config = require('../config.js');

// information from article:
//      edit:      true if any additional edit links should be generated
//      comment:   true if blue or red border should be placed based on comment
//      glyphicon: true if the bullet should be an edit glyphicon
//      editLink:  true if an "Edit&Translate" should be placed at the end of an article
//      overview:  true if title or a small text is shown, instead of an article
//      marktext:  true if missing language markdown should be <mark>ed.


var settings = {};



settings.overview = {
            edit : true,
            comment : true,
            glyphicon : true,
            editLink : true,
            overview : true
          }
settings.full = {
            edit : true,
            comment : true,
            glyphicon : true,
            marktext : true
          }
settings.fullfinal = {
            edit : true,
            comment : true,
            editLink : true
          }

var languages = {};



for (var i = 0;i<config.getLanguages().length;i++) {
  lang = config.getLanguages()[i];
  languages[lang] = {};
  languages[lang].left_lang = lang;
  
  if (lang != "EN") {
    languages["EN."+lang] = {};
    languages["EN."+lang].left_lang = "EN";
    languages["EN."+lang].right_lang = lang;
    languages["EN."+lang].bilingual = true;

    languages["EN("+lang+")"] = {};
    languages["EN("+lang+")"].left_lang = "EN";
    languages["EN("+lang+")"].right_lang = lang;
  }
}
languages["DE.EN"] = {};
languages["DE.EN"].left_lang = "DE";
languages["DE.EN"].right_lang = "EN";
languages["DE.EN"].bilingual = true;

languages["DE(EN)"] = {};
languages["DE(EN)"].left_lang = "DE";
languages["DE(EN)"].right_lang = "EN";

exports.settings = settings;
exports.languages=languages;

function getSettings(string) {

  if (typeof(string)=='undefined') {
    string = '';
  }
  var s = settings.full;
  var l = languages["DE(EN)"];



  for (var k in settings) {
    var temp = string.replace(k,'');
    if (temp != string) {
      s = settings[k];
      if (typeof(languages[temp])!='undefined') {
        l = languages[temp];
      }
    }
  }
  var result = {};
  for (k in s) {result[k]=s[k]};
  for (k in l) {result[k]=l[k]};
  return result;
}

exports.getSettings = getSettings;

