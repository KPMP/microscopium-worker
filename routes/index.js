let express = require('express');
let router = express.Router();
let MicroscopiumWorker = require('../src/MicroscopiumWorker').MicroscopiumWorker;
let SITES = require('../src/MicroscopiumWorker').SITES;

/* GET home page. */
router.get('/', function(req, res, next) {

  let worker = MicroscopiumWorker.getInstance();

  worker.clearData()
      .parseGeneToCellMap('./public/data/umich_sc_v1-0.csv', SITES.UMICH_SC)
      .then(worker.parseGeneToCellMap('./public/data/ucsf_sc_v1-0.csv', SITES.UCSF_SC))
      .then(worker.parseGeneToCellMap('./public/data/ucsd_sn_v1-0.csv', SITES.UCSD_SN))
      .then(() => worker.calcSiteGeneSetsByCellType())
      .then(() => {
        res.send(worker);
      });
});

module.exports = router;
