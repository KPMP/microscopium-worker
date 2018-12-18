const readline = require('readline');

class MicroscopiumWorker {

    constructor() {
        this.result = { cells: {}, genes: {} };
    }

    parseSchematicMap(fileName) {
        let lineReader = readline.createInterface({
            input: require('fs').createReadStream('../data/')
        });


    }

    parseGeneToCellMap(fileName) {

    }
}



lineReader.on('line', function (line) {
    console.log('Line from file:', line);
});

export default MicroscopiumWorker;



