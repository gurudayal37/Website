var mongoose=require('mongoose');
// var mongoosePaginate = require('mongoose-paginate');


var articleSchema=mongoose.Schema({
  title:{
    type:String,
    required:true
  },
  author:{
    type:String
  },
  question:{
    type:String,
    required:true
  },
  body:{
    type:String,
    required:true
  }
});

// articleSchema.plugin(mongoosePaginate);
var Article=module.exports = mongoose.model('Article', articleSchema)
