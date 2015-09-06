

var pg     = require('pg');
var async  = require('async');
var should = require('should');
var path   = require('path');
var debug  = require('debug')('OSMBC:test:user.test');

var config = require('../config.js');

var testutil = require('./testutil.js');

var userModule = require('../model/user.js');







describe('model/user', function() {
  before(function (bddone) {
    testutil.clearDB(bddone);
  }) 

  describe('createNewUser',function() {
    it('should createNewUser with prototype',function(bddone) {
      var newUser = userModule.createNewUser({name:"user"},function (err,result){
        should.not.exist(err);
        var id = result.id;
        testutil.getJsonWithId("usert",id,function(err,result){
          should.not.exist(err);
          should(result.name).equal('user');
          bddone();
        })
      })
    });
    it('should createNewUser without prototype',function(bddone) {
      var newUser = userModule.createNewUser(function (err,result){
        should.not.exist(err);
        var id = result.id;
        testutil.getJsonWithId("usert",id,function(err,result){
          should.not.exist(err);
          bddone();
        })
      });
    })
    it('should create no New User with ID',function(bddone){
      (function() {
        var newUser = userModule.createNewUser({id:2,name:"me again"},function (err,result){
        })
      }).should.throw();
      bddone();
    })
  })
  describe('findFunctions',function() {
    var idToFindLater;
    before(function (bddone) {
      // Initialise some Test Data for the find functions
      async.series([
        testutil.clearDB,
        function c1(cb) {userModule.createNewUser({OSMUser:"TheFive",access:"full"},cb)},
        function c2(cb) {userModule.createNewUser({OSMUser:"Test",access:"denied"},cb)},
        function c3(cb) {userModule.createNewUser({OSMUser:"Test2",access:"full"},
                         function(err,result){
                          should.not.exist(err);
                          idToFindLater = result.id;
                          cb(err);
                         })}

        ],function(err) {
          should.not.exist(err);
          bddone();
        });
    })
    describe('find',function() {
      it('should find multiple objects with sort',function(bddone){
        userModule.find({access:"full"},{column:"OSMUser"},function(err,result){
          should.not.exist(err);
          should.exist(result);
          should(result.length).equal(2);
          delete result[0]._meta;
          delete result[0].id;
          delete result[1]._meta;
          delete result[1].id;
          should(result[0]).eql({OSMUser:"Test2",access:"full",version:1});
          should(result[1]).eql({OSMUser:"TheFive",access:"full",version:1});
          bddone();
        })
      })
    })
    describe('findOne',function() {
      it('should findOne object with sort',function(bddone){
        userModule.findOne({OSMUser:"Test"},function(err,result){
          should.not.exist(err);
          should.exist(result);
          delete result._meta;
          delete result.id;
          should(result).eql({OSMUser:"Test",access:"denied",version:1});
          bddone();
        })
      })
    })
    describe('findById',function() {
      it('should find saved Object',function(bddone){
        userModule.findById(idToFindLater,function(err,result){
          should.not.exist(err);
          should.exist(result);
          delete result._meta;
          delete result.id;
          should(result).eql({OSMUser:"Test2",access:"full",version:1});
          bddone();
        })
      })
    })
  })
})
