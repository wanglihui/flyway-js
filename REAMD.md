# flyway-js

用nodejs实现 类似与flyway更新数据库逻辑

### 使用

```typescript
    import FlywayJs from "./index";
    const db_url = process.env.DB_URL;
    const sql_dir = process.cwd()+'/test/sql'
    async function main() {
        await new FlywayJs(db_url, sql_dir).run();
    }
```