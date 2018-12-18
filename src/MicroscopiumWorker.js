const readline = require('readline');
const fs = require('fs');

class MicroscopiumWorker {

    constructor() {
        this.result = { cells: {}, genes: {} };
        this.siteCellNamesToCanonical = {};
        this.schematic = {};
    }

    static getInstance() {
        if(MicroscopiumWorker.instance == null) {
            console.log('!!! instancing MicroscopiumWorker');
            MicroscopiumWorker.instance = new MicroscopiumWorker();
        }

        return MicroscopiumWorker.instance;
    }

    parseSchematicMap(fileName) {
        return new Promise(function(resolve, reject) {

            let worker = MicroscopiumWorker.getInstance();

            let lineReader = readline.createInterface({
                input: fs.createReadStream(fileName)
            });

            lineReader.on('line', (line) => {

                console.log('+++ line', line);

                let values = line.split(",")
                    , canonStructure = values[0]
                    , canonCellName = values[1]
                    , jeffCellName = values[2]
                    , umichScCellName = values[3]
                    , ucsfScCellName = values[4]
                    , ucsdScnCellName = values[5]
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
                    worker.siteCellNamesToCanonical[umichScCellName] = row;
                }

                if(ucsfScCellName != null && ucsfScCellName.length > 0) {
                    worker.siteCellNamesToCanonical[ucsfScCellName] = row;
                }

                if(ucsdScnCellName != null && ucsdScnCellName.length > 0) {
                    worker.siteCellNamesToCanonical[ucsdScnCellName] = row;
                }

                //Add entry to schematic
                if(!worker.schematic.hasOwnProperty(canonCellName)) {
                    worker.schematic[canonCellName] = {
                        canonStructure: canonStructure
                        , canonCellName: canonCellName
                        , jeffCellName: jeffCellName
                    };
                }

            });

            lineReader.on('close', () => {
                console.log('+++ close');
                resolve();
            });
        });
    }

    parseGeneToCellMap(fileName) {

    }
}

module.exports = MicroscopiumWorker;



