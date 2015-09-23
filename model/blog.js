// Exported Functions and prototypes are defined at end of file

var pg       = require('pg');
var async    = require('async');
var config   = require('../config.js');
var markdown = require('markdown').markdown;
var should   = require('should');

var articleModule = require('../model/article.js');
var logModule = require('../model/logModule.js');

var pgMap = require('./pgMap.js')
var debug = require('debug')('OSMBC:model:blog');



module.exports.table = "blog";

module.exports.categories = [
  {DE:"[Aktuelle Kategorie]",EN:"[Actual Category]"},
  {DE:"In eigener Sache",EN:"About us"},
  {DE:"Wochenaufruf",EN:"Weekly exerciseEN:"},
  {DE:"Mapping",EN:"Mapping"},
  {DE:"Community",EN:"Community"},
  {DE:"Importe",EN:"Imports"},
  {DE:"OpenStreetMap Foundation",EN:"OpenStreetMap Foundation"},
  {DE:"Veranstaltungen",EN:"Events"},
  {DE:"Humanitarian OSM",EN:"Humanitarian OSM"},
  {DE:"Karten",EN:"Maps"},
  {DE:"switch2OSM",EN:"#switch2OSM"},
  {DE:"Open-Data",EN:"Open Data"},
  {DE:"Lizenzen",EN:"Licences"},
  {DE:"Programme",EN:"Software"},
  {DE:"Programmierung",EN:"Programming"},
  {DE:"Kennst Du schon …",EN:"Did you know …"},
  {DE:"Weitere Themen mit Geo-Bezug",EN:'Other “geo” things'},
  {DE:"Wochenvorschau" ,EN:"Not Translated"}];


function Blog(proto)
{
  debug("Blog");
  this.id = 0;
  this._meta={};
  this._meta.table = "blog";
  this.categories = module.exports.categories;
  if (proto) {
    for (var k in proto) {
      this[k] = proto[k];
    }
  }
}

function create (proto) {
  debug("create");
  return new Blog(proto);
}

 

function setAndSave(user,data,callback) {
  debug("setAndSave");
  var self = this;
  delete self.lock;
  async.series([
    function checkID(cb) {
      if (self.id == 0) {
        self.save(cb);
      } else cb();
    }
  ],function(err){
    should.exist(self.id);
    should(self.id).not.equal(0);
    async.forEachOf(data,function(value,key,callback){
      if (typeof(value)=='undefined') return callback();
      if (value == self[key]) return callback();
      debug("Set Key %s to value %s",key,value);
      debug("Old Value Was %s",self[key]);
      articleModule.removeOpenBlogCache();
      async.series ( [
          function(callback) {
             logModule.log({oid:self.id,user:user,table:"blog",property:key,from:self[key],to:value},callback);
          },
          function(callback) {
            self[key] = value;
            callback();
          }
        ],function(err){
          callback(err);
        })

    },function(err) {
      if (err) return callback(err);
      self.save(callback);
    })
  })


} 

function find(obj1,obj2,callback) {
  debug("find");
  pgMap.find(this,obj1,obj2,callback);
}
function findById(id,callback) {
  debug("findById %s",id);
  pgMap.findById(id,this,callback);
}

function findOne(obj1,obj2,callback) {
  debug("findOne");
  pgMap.findOne(this,obj1,obj2,callback);
}

function createNewBlog(proto,callback) {
  debug("createNewBlog");
  if (typeof(proto)=='function') {
    callback = proto;
    delete proto;
  }
  should.not.exist(proto.id);

  this.findOne(null,{column:"name",desc:true},function(err,result) {
    var name = "WN250";
    if (result) {
      if (result.name.substring(0,2)=="WN") {
        name = result.name;
      }
    }
    debug("Maximaler Name %s",name);
    var wnId = name.substring(2,99);
    var newWnId = parseInt(wnId) +1;
    var newName = "WN"+newWnId;
    var blog = create();
    blog.name = newName;
    blog.status = "open";
    //copy flat prototype to object.
    for (var k in proto) {
      blog[k]=proto[k];
    }
    blog.save(callback);
  });
}

function preview(edit,lang,callback) {
  debug('preview');
  var self = this;

  if (typeof(lang)=='function') {
    callback = lang;
    lang = "DE";
  }
  var articles = {};
  var preview = "";

  articleModule.find({blog:this.name},{column:"title"},function(err,result){
    
    

    // Put every article in an array for the category
    for (var i=0;i<result.length;i++ ) {
      var r = result[i];
      if (typeof(articles[r.category]) == 'undefined') {
        articles[r.category] = [];
      }
      articles[r.category].push(r);
    }

    var clist = self.categories;
    
    

    // Generate the blog result along the categories
    for (var i=0;i<clist.length;i++) {
      var category = clist[i].DE;

      var categoryLANG = clist[i].DE;
      if (lang=="DE") categoryLANG = clist[i].DE;
      if (lang=="EN") categoryLANG = clist[i].EN;


   
      // If the category exists, generate HTML for it
      if (typeof(articles[category])!='undefined') {
        debug('Generating HTML for category %s',category);
        var htmlForCategory = ''

        for (var j=0;j<articles[category].length;j++) {
          var r = articles[category][j];
          if (edit == 'overview') {
            htmlForCategory += r.overview()+'\n';
          } else if  (lang == "DE") {
            htmlForCategory += r.preview(edit)+'\n';
          } else if (lang == "EN") {
            htmlForCategory += r.previewEN(edit)+'\n';
          }
        }
        var header = '<h2 id="'+categoryLANG.toLowerCase()+'">'+categoryLANG+'</h2>\n';
        htmlForCategory = header + '<ul>\n'+htmlForCategory+'</ul>\n'
        preview += htmlForCategory;
      }
    }
    var result = {};
    result.preview = preview;
    result.articles = articles;
    callback(null, result);
  })
}


function createTable(cb) {
  debug('createTable');
  createString = 'CREATE TABLE blog (  id bigserial NOT NULL,  data json,  \
                  CONSTRAINT blog_pkey PRIMARY KEY (id) ) WITH (  OIDS=FALSE);'
  createView = "create index on blog((data->>'version'))";
  pgMap.createTable('blog',createString,createView,cb)
}

function dropTable(cb) {
  debug('dropTable');
  pgMap.dropTable('blog',cb);
}

// Prototype Functions

// preview(edit,callback)
// edit: boolean, specifying wether generated HTML should contain edit links for articles or not
// result of preview is html code to display the blog.
Blog.prototype.preview = preview;

// setAndSave(user,data,callback)
// user: actual username for logging purposes
// data: json with values that has to be changed
// Function will change the given values and create for every field,
// where the value differes from representation in memory a log entry.
// at the end, the blog value is written in total
// This is may be relevant for concurrent save 
// as there is no locking with version numbers yet.
Blog.prototype.setAndSave = setAndSave;

// save
// just store the object in the database
Blog.prototype.save = pgMap.save;

// delete the object from the database
Blog.prototype.remove = pgMap.remove;

// Creation Functions

// Create a blog in memory with a given prototype
// create(proto)
// proto: (optional) JSON Data, to copy for the new object
//         the copy is a flat copy
module.exports.create= create;

// Create a blog in the database, 
// createNewBlog(proto,callback)
// for parameter see create
// proto is not allowed to have an id, this is generated by the database
// and stored into the object
module.exports.createNewBlog = createNewBlog;


// Find Functions

// find(object,order,callback)
// object (optional) find Objects, that conform with all values in the object
// order (optional)  field to sort by
module.exports.find = find;

// find(id,callback)
// id find Objects with ID
module.exports.findById = findById;

// findOne(object,order,callback)
// same as find, but callback returns one object, if it exists
module.exports.findOne = findOne;

// Create Tables in Prostgres with all indices and views
module.exports.createTable = createTable;

// Delete table in Postgres
module.exports.dropTable = dropTable;
