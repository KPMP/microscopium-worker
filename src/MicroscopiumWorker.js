const readline = require('readline');
const fs = require('fs');
const _ = require('lodash');

const SITES = {
    UMICH_SC: 'umich_sc'
    , UCSF_SC: 'ucsf_sc'
    , UCSD_SN: 'ucsd_sn'
};

const AVG_LOG_FC = '_avgLogFc';
const P_VAL_ADJ = '_p_val_adj';

class MicroscopiumWorker {

    constructor() {
        this.clearData();
    }

    static getInstance() {
        if(MicroscopiumWorker.instance == null) {
            MicroscopiumWorker.instance = new MicroscopiumWorker();
        }

        return MicroscopiumWorker.instance;
    }

    clearData() {
        this.result = { cells: {}, genes: {} };
        return this;
    }

    /**
     *
     * @param fileName
     * @returns {Promise<any>}
     */
    parseGeneToCellMap(fileName, siteName) {
        return new Promise((resolve, reject) => {
            let worker = MicroscopiumWorker.getInstance()
                , lineReader = readline.createInterface({ input: fs.createReadStream(fileName) });

            lineReader.on('line', (line) => {
                //Parse CSV of format: gene,p_val_adj,avg_logFC,site_cell_name
                let values       = line.split(",")
                    , geneName   = values[0]
                    , pValAdj    = values[1]
                    , avgLogFc   = values[2]
                    , cellName   = values[3]
                    , f_pValAdj  = parseFloat(pValAdj)
                    , f_avgLogFc = parseFloat(avgLogFc);

                //Skip the header row
                if(geneName.toLowerCase() === 'gene symbol') {
                    return;
                }

                //Build the row we'll add to the gene and cell collections
                let generatedDataRow = { gene: geneName, cell: cellName };
                generatedDataRow['f_' + siteName + P_VAL_ADJ]  = f_pValAdj;
                generatedDataRow['f_' + siteName + AVG_LOG_FC] = f_avgLogFc;

                //Ensure worker.result.cells[cellName]
                if(!worker.result.cells.hasOwnProperty(cellName)) {
                    worker.result.cells[cellName] = { rows: {} };
                }

                //Ensure worker.result.cells[cellName].rows[geneName]
                if(!worker.result.cells[cellName].rows.hasOwnProperty(geneName)) {
                    worker.result.cells[cellName].rows[geneName] = generatedDataRow;
                    worker.result.cells[cellName].rows[geneName].sites = [ siteName ];
                }

                else {
                    worker.result.cells[cellName].rows[geneName] =
                        Object.assign(worker.result.cells[cellName].rows[geneName], generatedDataRow);
                    worker.result.cells[cellName].rows[geneName].sites.push(siteName);
                }
            });

            lineReader.on('close', () => {
                resolve();
            });
        });
    }

    /**
     *
     */

    calcSiteGeneSetsByCellType() {
        return new Promise((resolve, reject) => {
            let worker = MicroscopiumWorker.getInstance();

            _.each(worker.result.cells, (cell, cellName) => {

                //Generate an empty (and key-indexed) map of venn intersection sets to hold gene totals for this cell
                cell.sets = {
                    'ucsd_sn': {sets: [SITES.UCSD_SN], size: 0},
                    'ucsf_sc': {sets: [SITES.UCSF_SC], size: 0},
                    'umich_sc': {sets: [SITES.UMICH_SC], size: 0},
                    'ucsd_sn_ucsf_sc': {sets: [SITES.UCSD_SN, SITES.UCSF_SC], size: 0},
                    'ucsd_sn_umich_sc': {sets: [SITES.UCSD_SN, SITES.UMICH_SC], size: 0},
                    'ucsf_sc_umich_sc': {sets: [SITES.UCSF_SC, SITES.UMICH_SC], size: 0},
                    'ucsd_sn_ucsf_sc_umich_sc': {sets: [SITES.UCSD_SN, SITES.UCSF_SC, SITES.UMICH_SC], size: 0}
                }

                //Increment the count for the associated site
                _.each(cell.rows, (row) => {
                    row.sites.sort();
                    cell.sets[row.sites.join('_')].size++;
                });

                //Once totals are counted, drop the keys from the cell's map; we no longer need them
                cell.sets = _.values(cell.sets);
            });

            resolve();
        });
    }
}

module.exports = { MicroscopiumWorker: MicroscopiumWorker, SITES: SITES };



