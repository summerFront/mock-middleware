const fs = require('fs')
const path = require('path')

const defaultMiddleware = (req, res, next) => {
    next()
}

const createMockMiddleware = (config) => {
    config = config || {}
    const mockConfigFile = config.mockConfigFile
    if (!mockConfigFile) {
        console.error('请配置mockConfigFile')
        return defaultMiddleware
    }
    const mockFileDir = config.mockFileDir
    if (!mockFileDir) {
        console.error('请配置mockFileDir')
        return defaultMiddleware
    }
    console.log('mockConfigFile: ', mockConfigFile)
    console.log('mockFileDir: ', mockFileDir)
    let mockConfig
    try {
        mockConfig = require(mockConfigFile)
    } catch (e) { }

    fs.watchFile(mockConfigFile, { interval: 500 }, (cue, pre) => {
        delete require.cache[mockConfigFile]
        try {
            mockConfig = require(mockConfigFile)
        } catch (e) { }
    })

    const mockMiddleware = (req, res, next) => {
        const mockUrl = mockConfig?.mockUrl || []
        const requsetUrl = req.path
        if (mockUrl.includes(requsetUrl)) {
            const mockFilePath = path.resolve(mockFileDir, `.${requsetUrl}`)
            delete require.cache[`${mockFilePath}.js`]

            let httpCode, responseData, responseHandler
            try {
                let mockInfo = require(`${mockFilePath}.js`)
                httpCode = mockInfo.httpCode || 200
                responseData = mockInfo.responseData
                responseHandler = mockInfo.responseHandler
            } catch (e) {
                res.status(404).send('获取mock数据文件失败')
                return
            }

            let body = ''
            req.on('data', (chunk) => {
                body += chunk.toString()
            })
            req.on('end', async () => {
                let params = {}
                try {
                    params = JSON.parse(body)
                } catch (e) {
                    console.log('body: ', body)
                }
                if (typeof responseHandler === 'function') {
                    try {
                        responseData = await responseHandler(params, req, res, next)
                    } catch (e) {
                        console.log('responseHandler 处理失败: ', e)
                    }
                    if (responseData === next) {
                        if (body) {
                            req.body = body
                        }
                        next()
                        return
                    }
                }
                res.status(httpCode).send(JSON.stringify(responseData))
            })
        } else {
            next()
        }
    }
    return mockMiddleware
}

module.exports = {
    createMockMiddleware
}
