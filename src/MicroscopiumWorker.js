const readline = require('readline');
const fs = require('fs');

const UMICH_SC = 'umich_sc';
const UCSF_SC = 'ucsf_sc';
const UCSD_SN = 'ucsd_sn';
const AVG_LOG_FC = '_avgLogFc';

class MicroscopiumWorker {

    constructor() {
        this.result = { cells: {}, genes: {}, siteCellNamesToCanonical: {}, schematic: {} };
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
    parseSchematicMap(fileName) {
        return new Promise((resolve, reject) => {
            let worker = MicroscopiumWorker.getInstance()
                , lineReader = readline.createInterface({ input: fs.createReadStream(fileName) });

            lineReader.on('line', (line) => {
                let values = line.split(",")
                    , canonStructure = values[0]
                    , canonCellName = values[1]
                    , jeffCellName = values[2]
                    , umichScCellName = values[3]
                    , ucsfScCellName = values[4]
                    , ucsdSnCellName = values[5]
                    , guess = values[6]
                    , row = {
                    canonicalCellName: canonCellName
                    , guess: guess
                };

                //If this is the header row, skip it
                if('canon_structure' == canonStructure) {
                    return;
                }

                //Parse values for site cell names to canonical mapping
                if(umichScCellName != null && umichScCellName.length > 0) {
                    let umichRow = Object.assign(row, {site: UMICH_SC});
                    worker.result.siteCellNamesToCanonical[umichScCellName] = umichRow;
                }

                if(ucsfScCellName != null && ucsfScCellName.length > 0) {
                    let ucsfRow = Object.assign(row, { site: UCSF_SC });
                    worker.result.siteCellNamesToCanonical[ucsfScCellName] = ucsfRow;
                }

                if(ucsdSnCellName != null && ucsdSnCellName.length > 0) {
                    let ucsdRow = Object.assign(row, { site: UCSD_SN });
                    worker.result.siteCellNamesToCanonical[ucsdSnCellName] = ucsdRow;
                }

                //Add entry to schematic
                if(!worker.result.schematic.hasOwnProperty(canonCellName)) {
                    worker.result.schematic[canonCellName] = {
                        canonStructure: canonStructure
                        , canonCellName: canonCellName
                        , jeffCellName: jeffCellName
                    };
                }

            });

            lineReader.on('close', () => {
                resolve();
            });
        });
    }

    /**
     *
     * @param fileName
     * @returns {Promise<any>}
     */
    parseGeneToCellMap(fileName) {
        return new Promise((resolve, reject) => {
            let worker = MicroscopiumWorker.getInstance()
                , lineReader = readline.createInterface({ input: fs.createReadStream(fileName) });

            worker.result.counter = {
                umich_sc: 0
                , ucsd_sn: 0
                , ucsf_sc: 0
            };

            lineReader.on('line', (line) => {
                //Parse CSV of format: gene,p_val_adj,avg_logFC,site_cell_name
                let values = line.split(",")
                    , geneName = values[0]
                    , pValAdj = values[1]
                    , avgLogFc = values[2]
                    , siteCellName = values[3];

                //Ensure we are working with a good value
                if(!worker.result.siteCellNamesToCanonical.hasOwnProperty(siteCellName)) {
                    //console.log('!!! Value not found: ', siteCellName);
                    return;
                }

                //First, look up the canonical cell name and site name
                let canonicalCellRow = worker.result.siteCellNamesToCanonical[siteCellName]
                    , canonicalCellName = canonicalCellRow.canonicalCellName
                    , siteName = canonicalCellRow.site;

                worker.result.counter[siteName]++;

                //Build the row we'll add to the gene and cell collections
                let generatedDataRow = { gene: geneName, cell: canonicalCellName };
                generatedDataRow[siteName] = pValAdj;
                generatedDataRow[siteName + AVG_LOG_FC] = avgLogFc;

                //Ensure worker.result.cells[canonicalCellName]
                if(!worker.result.cells.hasOwnProperty(canonicalCellName)) {
                    worker.result.cells[canonicalCellName] = { sets: [], rows: {} };
                }

                //Ensure worker.result.cells[canonicalCellName].rows[geneName]
                if(!worker.result.cells[canonicalCellName].rows.hasOwnProperty(geneName)) {
                    worker.result.cells[canonicalCellName].rows[geneName] = generatedDataRow;
                }

                else {
                    // let existingRow = worker.result.cells[canonicalCellName].rows[geneName];
                    // existingRow[siteName] = pValAdj;
                    // existingRow[siteName + AVG_LOG_FC] = avgLogFc;

                    worker.result.cells[canonicalCellName].rows[geneName] =
                        Object.assign(worker.result.cells[canonicalCellName].rows[geneName], generatedDataRow);
                }

                //If the gene does not exist in worker.result.genes, create it
                if(!worker.result.genes.hasOwnProperty(geneName)) {
                    worker.result.genes[geneName] = { rows: {} };
                }

                //If the gene does not exist in worker.result.genes, create it
                if(!worker.result.genes[geneName].rows.hasOwnProperty(canonicalCellName)) {
                    worker.result.genes[geneName].rows[canonicalCellName] = generatedDataRow;
                }

                else {
                    worker.result.genes[geneName].rows[canonicalCellName] =
                        Object.assign(worker.result.genes[geneName].rows[canonicalCellName], generatedDataRow);
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

module.exports = MicroscopiumWorker;



