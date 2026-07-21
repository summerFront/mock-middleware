const path = require('path')
const config = {
    mockUrl: ['/test', '/test1'],
    mockFileDir: path.resolve(__dirname, './mockData'),
    mockConfigFile: path.resolve(__dirname, './mock.config.js'),
}

module.exports = config