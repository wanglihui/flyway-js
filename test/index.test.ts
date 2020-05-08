import FlywayJs from "../index";

describe("FlywayJs", () => {

    before(()=>{
        process.env.DB_URL = process.env.DB_URL || "mysql://127.0.0.1:3306/itp-flyway?user=root&password=root123098"
        console.log('DB_URL is:', process.env.DB_URL )
    })

    it("#run should be ok", async() => {
        //如果要关闭文件hash校验需要传递 options参数
        let options = {
            allowHashNotMatch: false,
            // baseline: "V01__baseline.sql"
            // baseline: ""
             baseline: "V37__handed.sql"
        }
        return new FlywayJs(process.env.DB_URL, process.cwd()+'/test/sql', true, options).run();
    })
})
