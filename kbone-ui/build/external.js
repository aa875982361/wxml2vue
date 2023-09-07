const path = require('path')
console.log(__dirname, path.resolve(__dirname,'../src/utils'));
exports.alias = {
    "@utils": path.resolve(__dirname,'../src/utils')
}