var express  = require('express');
var router   = express.Router();
var async    = require('async');
var should   = require('should');
var debug    = require('debug')('OSMBC:routes:blog');
var config   = require('../config.js');
var moment   = require('moment');
var markdown = require('markdown-it')();
var help     = require('../routes/help.js');


var blogModule    = require('../model/blog.js');
var logModule     = require('../model/logModule.js');
var articleModule = require('../model/article.js');
var settingsModule = require('../model/settings.js');

function findBlogByRouteId(id,callback) {
  var blog;
  async.series([
  function findID(cb) {
    blogModule.findById(id,function(err,r) {
      if (err) return cb(err);
      if (r) blog= r;
      return cb();
    })
  },
  function findByName(cb) {
    if (blog) return cb();
    blogModule.find({name:id},function(err,r) {
      if (err) return cb(err);
      if (r.length==0) return cb();
      if (r.length>1) return cb(new Error("Blog >"+id+"< exists twice"));
      if (r) blog= r[0];
      return cb();
    })
  }], function(err) {
    if (err) return callback(err);
    if (!blog) return callback(new Error("Blog >"+id+"< not found"));
    callback(null,blog);
  })
}

/* GET users listing. */
function renderBlogId(req, res, next) {
  debug('router.get /:blog_id');
  req.session.articleReturnTo = req.originalUrl;

  var id = req.params.blog_id;
 
  var style = '';
  if (typeof(req.user.blogSetting0) == "string") {
    style = req.user.blogSetting0 + req.user.blogLanguages0;
  }

  if (req.session.lastStyle) style = req.session.lastStyle;

  if (req.query.style ) {
    style = req.query.style;
    req.session.lastStyle = style;
  }
  var options = settingsModule.getSettings(style);


  var user = req.user;
  for (var i=0;i<5;i++) {
    if (!user["blogSetting"+i]) {
      user["blogSetting"+i] = "";
      user["blogLanguages"+i] = "";
    }
    if (user.blogSetting0 == "") {
      user.blogSetting0 = "overview";
      user.blogLanguages0 = "DE.EN";
    }
  }




  findBlogByRouteId(id,function(err,blog) {
    if (err) return next(err);
    should.exist(blog);

    var changes = [];
    var articles = {};
    var main_text;


    async.series([
      function (callback) {
        blog.getPreview(style,user,function(err,result) {
          if (err) return callback(err);
          main_text = result.preview;
          articles = result.articles;
          callback();
        })
      },
      function (callback) {
        if (typeof(req.query.setStatus)!='undefined')
        {
          var changes = {status:req.query.setStatus};
          blog.setAndSave(user,changes,function(err) {
            if (err) {
              console.dir(err);
              info.message = JSON.stringify(err);
              info.status = 'error';
            }
            return callback();
          })
        } else return callback();
      },
      function (callback) {
        if (typeof(req.query.reviewComment)!='undefined')
        {
          blog.setReviewComment(options.left_lang,user,req.query.reviewComment,function(err) {
            if (err) {
              console.dir(err);
              info.message = JSON.stringify(err);
              info.status = 'error';
            }
            return callback();
          })
        } else return callback();
      },
      function (callback) {
        if (typeof(req.query.closeLang)!='undefined')
        {
          var status = true;
          if (req.query.status && req.query.status == "false") status = false;
          blog.closeBlog(options.left_lang,user,status,function(err) {
            if (err) {
              console.dir(err);
              info.message = JSON.stringify(err);
              info.status = 'error';
            }
            return callback();
          })
        } else return callback();
      },
 
 /*    function (callback) {
        articleModule.find({blog:blog.name},function(err,result){
          for (var i=0;i<result.length;i++ ) {
            var r = result[i];
            if (typeof(articles[r.category]) == 'undefined') {
              articles[r.category] = [];
            }
            articles[r.category].push(r);
          }
          callback();
        })
      },*/
      function (callback) {
        logModule.find({oid:id,table:"blog"},{column:"timestamp",desc :true},function(err,result) {
          if (err) return callback(err);
          changes = result;

          callback();
        })
      }],
      function (err) {
        should.exist(res.rendervar);
        res.render('blog',{layout:res.rendervar.layout,
                           main_text:main_text,
                           blog:blog,
                           changes:changes,
                           articles:articles,
                           style:style,
                           left_lang:options.left_lang,
                           right_lang:options.right_lang,
                           categories:blog.getCategories()});
      }
    )
  });
}
 


function renderBlogList(req, res, next) {
  debug('router.get /list');
  var status = req.query.status;
  var query = {};
  var additionalText;

  if (typeof(status)!='undefined') {
    query.status = status;
    if (status == '!=closed') {
      additionalText = help.getText( "blog.list.notClosed.md");
    }
  }


  async.auto({
        blogs:function(callback) {
                 blogModule.find(query,{column:"name",desc:true},function(err,blogs) {
                 callback(err,blogs);
              })
        }
      },function(err,result) {
          should.exist(res.rendervar);
          res.render('bloglist',{layout:res.rendervar.layout,
                                additionalText:additionalText,
                                blogs:result.blogs});
        });
};

function renderBlogPreview(req, res, next) {
  debug('renderBlogPreview');
 
  var id = req.params.blog_id;
  findBlogByRouteId(id,function(err,blog) {
    if (err) return next(err);
    should.exist(blog);

    var lang = req.query.lang;
    if (typeof(lang)=='undefined') lang = "DE";

    var changes = [];
    var returnToUrl = req.session.articleReturnTo;

    if (blog.status == "help") {
      returnToUrl = res.rendervar.layout.htmlroot + "/blog/"+blog.id;
    }
   




    async.auto({ 
        converter:function(callback) {
                    blog.getPreview(lang,function(err,result) {
                      callback(err,result);
                    })
                  }
      },
      function(err,result) {
        if (req.query.download=="true") {
          var content = result.converter.preview;
          
          res.setHeader('Content-disposition', 'attachment; filename=' + blog.name+'('+lang+')'+moment().locale(lang).format()+".html");
          res.setHeader('Content-type', "text/html");

          res.end(result.converter.preview,"UTF8");
          return;
        } else {
          should.exist(res.rendervar);
          res.render('blogpreview',{layout:res.rendervar.layout,
                             blog:blog,
                             articles:result.converter.articles,
                             preview:result.converter.preview,
                             lang:lang,
                             returnToUrl:returnToUrl,
                             categories:blog.getCategories()});
        }
      }
    )
  });
}

function createBlog(req, res, next) {
  debug('router.get /create');

  blogModule.createNewBlog(function(err,blogs) {
    res.redirect(config.getValue('htmlroot')+'/blog/list?status=open');
    //res.render('bloglist',{blogs:blogs,user:req.user});
  });
};

function editBlogId(req,res,next) {
  debug('editBlogId');
  var id = req.params.blog_id;
  var params = {};
  if (req.query.edit) params.edit = req.query.edit;
  if (params.edit && params.edit=="false") {
     res.redirect(config.getValue('htmlroot')+"/blog/edit/"+id);  
  }
  findBlogByRouteId(id,function(err,blog) {
    if (err) return next(err);
    should.exist(blog);
    should.exist(res.rendervar);
    res.render('editblog',{layout:res.rendervar.layout,
                       blog:blog,
                       params:params,
                       categories:blog.getCategories()});
  })
}

function postBlogId(req, res, next) {
  debug('postBlogId');
  var id = req.params.blog_id;
  findBlogByRouteId(id,function(err,blog) {
    if (err) return next(err);
    should.exist(blog);
    var categories;
    try {
      categories = JSON.parse(req.body.categories);      
    } catch (err) {
      return next(err);
    }
    var changes = {name:req.body.name,
                   startDate:req.body.startDate,
                   endDate:req.body.endDate,
                   status:req.body.status,
                   markdownImage:req.body.markdownImage,
                   categories:categories};

    blog.setAndSave(req.user.displayName,changes,function(err) {
      if (err) {
        return next(err);
      }
      res.redirect(config.getValue('htmlroot')+"/blog/edit/"+id);    
    })
  });
}


router.get ('/edit/:blog_id',editBlogId);
router.post('/edit/:blog_id',postBlogId);
router.get('/create', createBlog);
router.get('/list', renderBlogList);
router.get('/:blog_id', renderBlogId);
router.get('/:blog_id/preview', renderBlogPreview);
router.get('/:blog_id/preview_:blogname_:downloadtime', renderBlogPreview);
//router.post('/edit/:blog_id',postBlogId);

module.exports.router = router;


// the following modules are exported for test reasons
module.exports.renderBlogPreview = renderBlogPreview;
module.exports.renderBlogId = renderBlogId;


