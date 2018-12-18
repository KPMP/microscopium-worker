let express = require('express');
let router = express.Router();
let MicroscopiumWorker = require('../src/MicroscopiumWorker');

/* GET home page. */
router.get('/', function(req, res, next) {

  let worker = MicroscopiumWorker.getInstance();

  worker.parseSchematicMap('./public/data/schematic.csv')
        .then(worker.parseGeneToCellMap('./public/data/ucsd_sn_v1-0.csv'))
        .then(worker.parseGeneToCellMap('./public/data/ucsf_sc_v1-0.csv'))
        .then(worker.parseGeneToCellMap('./public/data/umich_sc_v1-0.csv'))
      .then(() => {
        res.send(worker);
      });
});

module.exports = router;
