# flyway-js

用nodejs实现 类似与flyway更新数据库逻辑
底层使用sequelize.js 执行数据库脚本，理论上sequlize支持的数据库都能使用

### 安装
```
     yarn add flyway-js 
     # 或者 npm i flyway-js -S
```

### 使用

```typescript
    import FlywayJs from "flywaj-js";
    //数据库连接
    const db_url = process.env.DB_URL;
    //SQL 或者 ts，js 路径 
    const sql_dir = process.cwd()+'/test/sql'
    async function main() {
        await new FlywayJs(db_url, sql_dir).run();
    }
    
    //如果要关闭文件hash校验需要传递 options参数 
    let options = {
        allowHashNotMatch: true,
    }
    //如果 force_init 为 true 则每次请求flyway_js 表。主要为啦适配单元测试.生产 需要是 false. 单元测试时 需要为 true
    let force_init = true;
    new FlywayJs(db_url, sql_dir, force_init, options).run();
```

### SQL文件或者js、ts文件要求

- SQL文件 将获取SQL文件内容直接执行
- TS或JS文件 将require 文件，执行默认导出函数，导出函数格式如下:

````typescript
export default function(db: Sequelize, t: sequelize.Transaction) {
    //处理数据库逻辑，如果需要事务处理，可以将t传入到需要事务的地方。    
}
````

### 测试 

```
    npx mocha
```
