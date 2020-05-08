# flyway-nodejs

Forked from [flyway-js](https://github.com/wanglihui/flyway-js)

做了如下功能优化：
- 支持SQL脚本中编写多组脚本
- 支持baseline指定基准脚本

用nodejs实现 类似与flyway更新数据库逻辑
底层使用sequelize.js 执行数据库脚本，理论上sequlize支持的数据库都能使用

## 安装
```
     yarn add flyway-nodejs 
     # 或者 npm i flyway-ndejs -S
```

## quick start

```typescript
    import FlywayJs from "flywaj-nodejs";
    //数据库连接
    const db_url = process.env.DB_URL;
    //SQL 或者 ts，js 路径 
    const sql_dir = process.cwd()+'/test/sql'
    async function main() {
        await new FlywayJs(db_url, sql_dir).run();
    }
    
    let options = {
        //关闭文件hash校验，默认为false
        allowHashNotMatch: true,
        //指定数据库基准脚本文件名，默认为""
        baseline: ""
    }
    //如果 force_init 为 true 则每次请求flyway_js 表。主要为啦适配单元测试.生产 需要是 false. 单元测试时 需要为 true
    let force_init = true;
    new FlywayJs(db_url, sql_dir, force_init, options).run();
```

## 规范

- 目前支持.sql和.js/ts脚本
- 按文件名排序后执行。关于脚本命名规范，建议采用[flyway的脚本命名规范](https://flywaydb.org/documentation/migrations#sql-based-migrations)。
- .sql文件中以';'分隔多组SQL脚本；
- .ts或.js文件 将require 文件，执行默认导出函数，导出函数格式如下:
    ```typescript
    export default function(db: Sequelize, t: sequelize.Transaction) {
        //处理数据库逻辑，如果需要事务处理，可以将t传入到需要事务的地方。    
    }
    ```

## 功能说明

### Baseline

指定数据库的基准脚本（Baselines an existing database, excluding all migrations up to and including baselineVersion.）

>基本脚本：
>已有数据库是通过执行一系列脚本得到的，其中最后一个被执行的脚本就是该数据库版本的基准脚本。

#### 使用场景1

首次在已有系统使用本插件管理数据库版本时，需要跳过已经手工执行过的数据库脚本。
假设基准脚本为Vxx__t.sql，使用本插件时应该指定基准脚本，如下：

```js
let options = {
    allowHashNotMatch: false,
    baseline: "Vxx__t.sql"
}
```
指定后，运行FlywayJs.run()时，按脚本名称排序后，处于Vxx__t.sql之前的脚本（包括基准脚本）只会被登记到flyway_js表，而不会执行脚本中的内容。

登记到flyway_js表中的脚本，执行FlywayJs.run()时都会检查Hash。

#### 使用场景2

系统运行过程中，某些情况下，手工执行过数据库脚本，这时应该修改baseline指向最后一个手工执行的脚本。

```js
let options = {
    allowHashNotMatch: false,
    baseline: "Vxx__最后一个已执行过的脚本.sql"
}
```

### 测试 

- 安装mocha
```
$ npm i mocha -g
```
- 通过环境变量指明测试数据库
```
$ export DB_URL="mysql://127.0.0.1:3306/itp-flyway?user=root&password=root123098"
```
- 执行测试
```
npx mocha
```
