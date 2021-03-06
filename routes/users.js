var express = require('express');
var should = require('should');
var async = require('async');
var userModule = require('../model/user.js');
var debug = require('debug')('OSMBC:router:users');
var router = express.Router();
var util = require('../util.js');
var moment = require('moment');
var articleModule = require('../model/article.js');
var logModule = require('../model/logModule.js');
var config = require('../config.js');


function renderList(req,res,next) {
  debug('renderList');
  var users;
  var query = {};
  var sort = {column:"OSMUser"};
  if (req.query.access) query.access = req.query.access;
  if (req.query.sort) sort.column = req.query.sort;
  if (req.query.desc) sort.desc = true; 
  if (req.query.lastAccess) query.lastAccess = req.query.lastAccess;
  async.parallel([
      function(callback) {
        userModule.find(query,sort,function(err,result) {
          users = result;
          callback();
        })
      }

    ],function(error) {
        should.exist(res.rendervar);
        res.render('userList',{layout:res.rendervar.layout,
                                users:users});      
    }
  )

}



function renderUserId(req, res, next) {
  debug('router.get');
  var id = req.params.user_id;
  should.exist(id);
  var params = {};
  if (req.query.edit) params.edit = req.query.edit;
  var user;
  var changes;
  async.series([
    function findAndLoadChanges(cb) {
      debug('findAndLoadChanges');
      logModule.find({table:"usert",oid:id},{column:"timestamp",desc:true},function findAndLoadChanges_CB(err,result){
        debug('findAndLoadChanges_CB');
        if (err) return cb(err);
        changes = result;
        cb();
      })
    },
    function findAndLoaduser(cb){
      debug('findAndLoaduser');
      userModule.findById(id,function findAndLoaduser_CB(err,result) {
        debug('findAndLoaduser_CB');
        if (err) return cb(err);
        user = result;
        cb();
      })
    }
    ],
    function finalRenderCB(err) {
      debug('finalRenderCB');
      if (err) return next(err);
      if (! user || typeof(user.id) == 'undefined') return next(new Error("User ID not Found"));
      should.exist(res.rendervar)
      res.render('user',{usershown:user,
                        changes:changes,
                        params:params,
                        layout:res.rendervar.layout});
    }
  ) 
}

function postUserId(req, res, next) {
  debug('postUserId');
  var id = req.params.user_id;
  userModule.findById(id,function(err,user) {
    if (typeof(user.id) == 'undefined') return next();
    var changes = {OSMUser:req.body.OSMUser,
                   access:req.body.access};

    user.setAndSave(req.user.displayName,changes,function(err) {
      if (err) {
        return next(err);
      }
      res.redirect(config.getValue('htmlroot')+"/usert/"+id);    
    })
  });
}

function createUser(req, res, next) {
  debug('createUser');
  var proto = {};
  userModule.createNewUser(proto,function(err,user) {
    res.redirect(config.getValue('htmlroot')+'/usert/'+user.id+"?edit=true");
  });
};

router.get('/list',renderList);
router.get('/create',createUser);
router.get('/:user_id',renderUserId);
router.post('/:user_id', postUserId);

module.exports.createUser = createUser;
module.exports.postUserId = postUserId;
module.exports.renderUserId = renderUserId;
module.exports.renderList = renderList;

module.exports.router = router;
