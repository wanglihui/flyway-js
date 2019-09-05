# flyway-js

用nodejs实现 类似与flyway更新数据库逻辑
底层使用sequelize.js 执行数据库脚本，理论上sequlize支持的数据库都能使用

### 使用

```typescript
    import FlywayJs from "./index";
    const db_url = process.env.DB_URL;
    const sql_dir = process.cwd()+'/test/sql'
    async function main() {
        await new FlywayJs(db_url, sql_dir).run();
    }
```

### SQL文件或者js、ts文件要求

- SQL文件 将获取SQL文件内容直接执行
- TS或JS文件 将require 文件，执行默认导出函数，导出函数格式如下:

````typescript
export default function(db: Sequelize, t: sequelize.Transaction) {
    //处理数据库逻辑，如果需要事务处理，可以将t传入到需要事务的地方。    
}
````