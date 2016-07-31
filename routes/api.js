var express = require('express');
var router = express.Router();


module.exports = function(controller){
  /* GET home page. */
  router.get('/:product', controller.getProduct);

  return router;

};
