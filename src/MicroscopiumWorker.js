const readline = require('readline');
const fs = require('fs');

const SITES = {
    UMICH_SC: 'umich_sc'
    , UCSF_SC: 'ucsf_sc'
    , UCSD_SN: 'ucsd_sn'
};

const AVG_LOG_FC = '_avgLogFc';

class MicroscopiumWorker {

    constructor() {
        this.result = { cells: {}, genes: {} };
    }

    static getInstance() {
        if(MicroscopiumWorker.instance == null) {
            console.log('!!! instancing MicroscopiumWorker');
            MicroscopiumWorker.instance = new MicroscopiumWorker();
        }

        return MicroscopiumWorker.instance;
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

                //Build the row we'll add to the gene and cell collections
                let generatedDataRow = { gene: geneName, cell: cellName };
                generatedDataRow[siteName] = pValAdj;
                generatedDataRow[siteName + AVG_LOG_FC] = avgLogFc;
                generatedDataRow['f_' + siteName] = f_pValAdj;
                generatedDataRow['f_' + siteName + AVG_LOG_FC] = f_avgLogFc;

                //Ensure worker.result.cells[cellName]
                if(!worker.result.cells.hasOwnProperty(cellName)) {
                    worker.result.cells[cellName] = { sets: [], rows: {} };
                }

                //Ensure worker.result.cells[cellName].rows[geneName]
                if(!worker.result.cells[cellName].rows.hasOwnProperty(geneName)) {
                    worker.result.cells[cellName].rows[geneName] = generatedDataRow;
                }

                else {
                    worker.result.cells[cellName].rows[geneName] =
                        Object.assign(worker.result.cells[cellName].rows[geneName], generatedDataRow);
                }

                //Ensure worker.result.genes[geneName]
                if(!worker.result.genes.hasOwnProperty(geneName)) {
                    worker.result.genes[geneName] = { rows: {} };
                }

                //Ensure worker.result.genes[geneName].rows[cellName]
                if(!worker.result.genes[geneName].rows.hasOwnProperty(cellName)) {
                    worker.result.genes[geneName].rows[cellName] = generatedDataRow;
                }

                else {
                    worker.result.genes[geneName].rows[cellName] =
                        Object.assign(worker.result.genes[geneName].rows[cellName], generatedDataRow);
                }

            });

            lineReader.on('close', () => {
                resolve();
            });
        });
    }

    calcCellSiteCounts() {
        //TODO iterate over all genes in worker.result.cells.rows; build worker.result.cells.sets with all non-false values for sites
    }
}

module.exports = { MicroscopiumWorker: MicroscopiumWorker, SITES: SITES };



