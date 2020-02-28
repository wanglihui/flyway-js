import FlywayJs from "../index";

describe("FlywayJs", () => {

    it("#run should be ok", async() => {
        //如果要关闭文件hash校验需要传递 options参数
        let options = {
            allowHashNotMatch: false,
            // baseline: "V01__baseline.sql"
            // baseline: ""
             baseline: "V37__handed.sql"
        }
        return new FlywayJs(process.env.DB_URL, process.cwd()+'/test/sql', false, options).run();
    })
})
