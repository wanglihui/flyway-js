import FlywayJs from "../index";

describe("FlywayJs", () => {

    it("#run should be ok", async() => {
        return new FlywayJs(process.env.DB_URL, process.cwd()+'/test/sql').run();
    })
})
