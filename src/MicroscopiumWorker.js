const readline = require('readline');
const fs = require('fs');

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
                    canonCellName: canonCellName
                    , guess: guess
                };

                //If this is the header row, skip it
                if(canonStructure == 'canon_structure') {
                    return;
                }

                //Parse values for site cell names to canonical mapping
                if(umichScCellName != null && umichScCellName.length > 0) {
                    row.site = 'umich_sc';
                    worker.result.siteCellNamesToCanonical[umichScCellName] = row;
                }

                if(ucsfScCellName != null && ucsfScCellName.length > 0) {
                    row.site = 'ucsf_sc';
                    worker.result.siteCellNamesToCanonical[ucsfScCellName] = row;
                }

                if(ucsdSnCellName != null && ucsdSnCellName.length > 0) {
                    row.site = 'ucsd_sn';
                    worker.result.siteCellNamesToCanonical[ucsdSnCellName] = row;
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

    parseGeneToCellMap(fileName) {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }
}

module.exports = MicroscopiumWorker;



