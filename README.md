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