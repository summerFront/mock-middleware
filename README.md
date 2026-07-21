# Mock Middleware

一个轻量级的 Express Mock 中间件，支持热更新、动态响应处理和灵活的配置。

## 特性

- ✅ **热更新支持**：配置文件和 mock 数据文件修改后自动生效，无需重启服务
- ✅ **动态响应处理**：支持通过函数动态生成响应数据
- ✅ **灵活配置**：支持配置多个 mock URL 和自定义 mock 文件目录
- ✅ **请求参数获取**：自动解析 POST 请求体参数
- ✅ **透明传递**：支持跳过 mock 直接转发请求到下一个中间件

## 安装

```bash
npm install dev-mock-middleware
```

或将 `index.js` 复制到你的项目中，或通过 require 引入。

## 基本使用

```javascript
const express = require('express')
const { createMockMiddleware } = require('mock-middleware')
// const { createMockMiddleware } = require('./mockMiddleware')

const app = express()

const mockMiddleware = createMockMiddleware({
    mockConfigFile: '/path/to/mock.config.js',
    mockFileDir: '/path/to/mockData',
})

app.use(mockMiddleware)

app.listen(8080)
```

## 配置说明

### 初始化配置

调用 `createMockMiddleware` 时传入配置对象：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `mockConfigFile` | `string` | 是 | mock 配置文件的绝对路径 |
| `mockFileDir` | `string` | 是 | mock 数据文件所在目录的绝对路径 |

示例：

```javascript
const path = require('path')
const mockMiddleware = createMockMiddleware({
    mockConfigFile: path.resolve(__dirname, './mock.config.js'),
    mockFileDir: path.resolve(__dirname, './mockData'),
})
```

### Mock 配置文件 (`mock.config.js`)

配置文件需导出一个对象，包含以下字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `mockUrl` | `string[]` | 是 | 需要被 mock 拦截的 URL 路径列表 |

> **注意**：`mockFileDir` 和 `mockConfigFile` 是传递给 `createMockMiddleware` 的初始化参数，不是配置文件中的字段。配置文件只需要配置 `mockUrl`。

示例：

```javascript
const config = {
    mockUrl: ['/test', '/api/users', '/api/login'],
}

module.exports = config
```

## Mock 数据文件格式

每个 mock URL 对应一个 mock 数据文件，文件需放在 `mockFileDir` 目录下。

### 文件命名规则

URL 路径直接映射到文件路径：

- `/test` → `mockData/test.js`
- `/api/users` → `mockData/api/users.js`
- `/api/login` → `mockData/api/login.js`

### 文件导出格式

mock 数据文件需导出一个对象，包含以下字段：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `httpCode` | `number` | 否 | `200` | HTTP 响应状态码 |
| `responseData` | `any` | 否 | - | 默认响应数据 |
| `responseHandler` | `function` | 否 | - | 动态响应处理函数 |

#### 基础示例

```javascript
const httpCode = 200
const responseData = {
    code: 1,
    msg: 'success',
    data: {
        name: 'summer',
        age: 18,
    },
}

module.exports = {
    httpCode,
    responseData,
}
```

#### 动态响应示例

通过 `responseHandler` 函数根据请求参数动态生成响应：

```javascript
const httpCode = 200
const responseData = {
    code: 1,
    msg: 'success',
    data: [],
}

const responseHandler = (params, req, res, next) => {
    if (params.id === '1') {
        return {
            code: 1,
            msg: 'success',
            data: {
                id: '1',
                name: 'summer',
            },
        }
    }
    return {
        code: 0,
        msg: '用户不存在',
        data: null,
    }
}

module.exports = {
    httpCode,
    responseData,
    responseHandler,
}
```

#### 跳过 Mock 示例

当 `responseHandler` 返回 `next` 函数时，中间件会跳过 mock，将请求转发到下一个中间件：

```javascript
const httpCode = 200
const responseData = {
    code: 1,
    msg: 'success',
}

const responseHandler = (params, req, res, next) => {
    if (params.bypass) {
        return next
    }
    return responseData
}

module.exports = {
    httpCode,
    responseData,
    responseHandler,
}
```

### responseHandler 参数说明

`responseHandler` 函数接收以下参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| `params` | `object` | 解析后的请求体参数（POST 请求） |
| `req` | `object` | Express 请求对象 |
| `res` | `object` | Express 响应对象 |
| `next` | `function` | Express 下一个中间件函数 |

**返回值说明**：

- 返回普通数据：作为响应体返回给客户端
- 返回 `next` 函数：跳过 mock，转发请求到下一个中间件

## 热更新机制

中间件内置热更新支持，修改配置文件或 mock 数据文件后自动生效，无需重启服务。

### 配置文件热更新

监听 `mockConfigFile` 的变化，文件修改后自动重新加载配置：

```javascript
fs.watchFile(mockConfigFile, { interval: 500 }, (cue, pre) => {
    delete require.cache[mockConfigFile]
    mockConfig = require(mockConfigFile)
})
```

> **注意**：只有 `mockUrl` 字段的修改会触发热更新。`mockFileDir` 是初始化参数，修改后需要重启服务才能生效。

### Mock 数据文件热更新

每次请求时都会重新加载对应的数据文件，确保使用最新的 mock 数据：

```javascript
delete require.cache[`${mockFilePath}.js`]
let mockInfo = require(`${mockFilePath}.js`)
```

## 工作原理

```
请求进入 → URL 是否在 mockUrl 列表中？
              ↓
          是 → 查找对应的 mock 文件
              ↓
          文件存在？
              ↓ 是            ↓ 否
          加载 mock 配置    返回 404 错误
              ↓
          responseHandler 存在？
              ↓ 是            ↓ 否
          调用 handler      使用 responseData
              ↓
          handler 返回 next？
              ↓ 是            ↓ 否
          跳过 mock         返回响应数据
              ↓
          转发到下一个中间件
```

## 目录结构示例

```
project/
├── index.js              # Express 入口文件
├── mock.config.js        # Mock 配置文件
├── mockMiddleware/
│   └── index.js          # Mock 中间件
└── mockData/             # Mock 数据文件目录
    ├── test.js           # /test
    └── api/
        ├── users.js      # /api/users
        └── login.js      # /api/login
```

## 完整示例

### 入口文件 (`index.js`)

```javascript
const express = require('express')
const path = require('path')
const { createMockMiddleware } = require('./mockMiddleware')
const mockConfig = require('./mock.config')

const mockMiddleware = createMockMiddleware({
    ...mockConfig,
    mockConfigFile: path.resolve(__dirname, './mock.config.js'),
    mockFileDir: path.resolve(__dirname, './mockData'),
})

const app = express()
app.use(mockMiddleware)

app.use((req, res) => {
    res.send('Hello World')
})

app.listen(8192)
console.log('服务已启动')
```

### 配置文件 (`mock.config.js`)

```javascript
const config = {
    mockUrl: ['/test', '/api/users'],
}

module.exports = config
```

### Mock 数据文件 (`mockData/test.js`)

```javascript
const httpCode = 200
const responseData = {
    code: 1,
    msg: 'success',
}

const responseHandler = (params, req, res, next) => {
    if (params.skip) {
        return next
    }
    return responseData
}

module.exports = {
    httpCode,
    responseData,
    responseHandler,
}
```

## 测试示例

项目包含测试目录 `test/`，可直接运行测试：

```bash
cd test
npm install
npm start
```

然后访问 `http://localhost:8192/test` 即可查看 mock 效果。

## License

ISC