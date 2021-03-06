var should = require('should');
var debug = require('debug')('OSMBC:router:index');
var express = require('express');
var router = express.Router();

var logModule = require('../model/logModule.js');

/* GET home page. */

function renderHome(req,res,next) {
  debug('renderHome');
  should.exist(res.rendervar.layout);

  logModule.find({},{column:"id",desc :true,limit:20},function(err,result) {
    if (err) return next(err);
  
    res.render('index', { title: 'OSMBC' , 
                          layout:res.rendervar.layout,
                          changes:result});  
  })
}

function renderReleaseNotes(req,res,next) {
  debug('renderReleaseNotes');
  var level = req.query.level;
  should.exist(res.rendervar.layout);
  res.render('release_notes',{level:level,
                              layout:res.rendervar.layout});  
}
function renderHelp(req,res,next) {
  debug('help');
  should.exist(res.rendervar.layout);
  res.render('help',{layout:res.rendervar.layout});  
}

router.get('/', renderHome);
router.get('/osmbc.html', renderHome);
router.get('/osmbc', renderHome);
router.get('/release_notes.html', renderReleaseNotes);
router.get('/help.html', renderHelp);




module.exports.router = router;
module.exports.renderHome = renderHome;
