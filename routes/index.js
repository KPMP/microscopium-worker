let express = require('express');
let router = express.Router();
let MicroscopiumWorker = require('../src/MicroscopiumWorker');

/* GET home page. */
router.get('/', function(req, res, next) {

  let worker = MicroscopiumWorker.getInstance();
  worker
      .parseSchematicMap('./public/data/schematic.csv')
      .then(() => {
        console.log('+++ all done, schematic: ', worker.schematic);
        res.send(worker.schematic)
      });

  //res.send(output);
});

module.exports = router;
