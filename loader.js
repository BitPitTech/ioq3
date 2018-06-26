const fs = require('fs');
const path = require('path');

ioq3ded = {
    'wasmBinary': fs.readFileSync(path.join(__dirname, 'ioq3ded.wasm')),
    'locateFile': function(file) {
        const localPath = path.join(__dirname, file);
        return localPath;
    },
    'loadBinary': function(file) {
        if (!fs.existsSync(file)) {
            return null;
        }
        return fs.readFileSync(fs.realpathSync(file));
    }
};
require('./quake');
