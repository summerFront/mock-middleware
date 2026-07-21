const express = require('express')
const { createMockMiddleware } = require('../index.js')
const config = require('./mock.config.js')

const mockMiddleware = createMockMiddleware(config)

const app = express()
app.use(mockMiddleware)
app.use((req, res, next) => {
    res.send('hello world')
})
app.listen(8192)
console.log('服务已启动')
