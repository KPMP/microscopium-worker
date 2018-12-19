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
        this.result = { cells: {}, genes: {} };
        this.state = { lineTicker: 0 };
    }

    static getInstance() {
        if(MicroscopiumWorker.instance == null) {
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

                //Skip the header row
                if(geneName.toLowerCase() == 'gene symbol') {
                    return;
                }

                //Build the row we'll add to the gene and cell collections
                let generatedDataRow = { gene: geneName, cell: cellName };
                generatedDataRow['f_' + siteName + P_VAL_ADJ]  = f_pValAdj;
                generatedDataRow['f_' + siteName + AVG_LOG_FC] = f_avgLogFc;

                //Ensure worker.result.cells[cellName]
                if(!worker.result.cells.hasOwnProperty(cellName)) {
                    worker.result.cells[cellName] = { sitesToGenes: {}, rows: {} };
                }

                //Ensure worker.result.cells[cellName].rows[geneName]
                if(!worker.result.cells[cellName].rows.hasOwnProperty(geneName)) {
                    worker.result.cells[cellName].rows[geneName] = generatedDataRow;
                }

                else {
                    worker.result.cells[cellName].rows[geneName] =
                        Object.assign(worker.result.cells[cellName].rows[geneName], generatedDataRow);
                }

                //Ensure worker.results.cells[cellName].sitesToGenes[siteName]
                if(!worker.result.cells[cellName].sitesToGenes.hasOwnProperty(siteName)) {
                    worker.result.cells[cellName].sitesToGenes[siteName] = [];
                }

                //TODO Add placeholder to sets to show this TIS has this gene for this cell
                worker.result.cells[cellName].sitesToGenes[siteName].push(geneName);

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

    /**
     *
     */
    calcSiteGeneSetsByCellType() {
        return new Promise((resolve, reject) => {
            let worker = MicroscopiumWorker.getInstance();

            for (let cellName in worker.result.cells) {
                let cell = worker.result.cells[cellName]
                    , debugMode = cellName === 'Proximal tubule';

                //The order here is important: proceed from highest set-intersection potential to lowest (single site)
                //We do this because we will be removing duplicate genes from the single site totals as we find intersection
                let vennSets = [
                    {sets: [SITES.UCSD_SN, SITES.UMICH_SC, SITES.UCSF_SC], size: 0},
                    {sets: [SITES.UCSD_SN, SITES.UCSF_SC], size: 0},
                    {sets: [SITES.UCSD_SN, SITES.UMICH_SC], size: 0},
                    {sets: [SITES.UCSF_SC, SITES.UMICH_SC], size: 0},
                    {sets: [SITES.UCSD_SN], size: 0},
                    {sets: [SITES.UCSF_SC], size: 0},
                    {sets: [SITES.UMICH_SC], size: 0}
                ];

                for (let vennSetIndex in vennSets) {
                    let vennSet = vennSets[vennSetIndex];

                    //TODO Ensure that all sites for the venn set under calculation have contributed genes
                    let allSetSitesPresentInThisCell = true;

                    for (let siteNameIndex in vennSet.sets) {
                        let siteName = vennSet.sets[siteNameIndex];

                        if (!cell.sitesToGenes.hasOwnProperty(siteName)) {
                            allSetSitesPresentInThisCell = false;
                            if(debugMode) console.log('!!! Site, cell not found: ', siteName, cellName);
                            break;
                        }
                    }

                    if (!allSetSitesPresentInThisCell) {
                        continue;
                    }

                    //TODO If there is only one site in this vennSet, skip intersection derivation
                    let size = 0
                        , siteCount = vennSet.sets.length;

                    if(debugMode) console.log('vennSet site count, cell: ', siteCount, cellName);

                    if (siteCount === 1) {
                        let siteName = vennSet.sets[0];
                        size = cell.sitesToGenes[siteName].length;
                        if(debugMode) console.log('+++ Saving size ' + size + ' for single site, cell: ', siteName, cellName);
                    }

                    else {
                        //TODO First, find the intersection between the given arrays
                        // https://lodash.com/docs/#intersection
                        // https://www.w3schools.com/js/js_function_apply.asp
                        let intersect = _.intersection.apply(_, Object.values(cell.sitesToGenes));

                        if(debugMode) console.log('intersect: ', intersect);

                        //TODO Second, count the resulting set size (the intersection)
                        size = intersect.length;

                        //TODO Third, remove the common elements from the single-site arrays
                        //https://lodash.com/docs/4.17.11#pullAll
                        for (let siteName in cell.sitesToGenes) {
                            let siteGenes = cell.sitesToGenes[siteName];
                            if(debugMode) console.log('siteName: ', siteName);
                            if(debugMode) console.log('siteGenes: ', siteGenes);
                            _.pullAllWith(siteGenes, intersect, (a, b) => { return a === b; });
                        }
                    }

                    //TODO Last, save the size to the vennSet
                    vennSet.size = size;
                }

                //Assign to cell.sets
                cell.sets = vennSets;
            }

            console.log('+++ Done');
            resolve();
        });
    }
}

module.exports = { MicroscopiumWorker: MicroscopiumWorker, SITES: SITES };



