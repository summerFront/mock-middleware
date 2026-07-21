const httpCode = 200
const responseData = {
    code: 1,
    msg: 'success',
}

const responseHandler = (params, req, res, next) => {
    return next
}

module.exports = {
    httpCode,
    responseData,
    responseHandler
}