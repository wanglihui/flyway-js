import {Sequelize} from "sequelize";
import * as path from 'path';
import * as fs from 'fs';
import * as sequelize from "sequelize";
import {Models} from './models';
import * as crypto from 'crypto';

export default class FlywayJs {

    public sequlize: Sequelize;

    constructor(public connect: string, public scriptDir?: string) {
        this.sequlize = new Sequelize(connect);
        if (!scriptDir) {
            this.scriptDir = path.resolve(process.cwd(), 'sql');
        }
    }

    async run(ignores?: (RegExp|string)[]) {
        if (!fs.existsSync(this.scriptDir)) {
            return;
        }
        await this.prepare();
        let files = fs.readdirSync(this.scriptDir);
        files.sort();
        for(let file of files) {
            if (this.isNeedIgnore(file, ignores)) {
                continue;
            }
            let filepath = path.resolve(this.scriptDir, file);
            //查找是否已经执行
            if (await this.hasExec(file, filepath)) {
                continue;
            }
            let t = await this.sequlize.transaction()
            //执行sql文件
            if (/\.sql$/.test(file)) {
                await this.execSql(filepath, t);
            }
            //执行js或者ts
            if (/\.(js|ts)$/.test(file)) {
                await this.execJsOrTs(filepath, t);
            }
            await this.storeSqlExecLog(file, filepath, t);
            await t.commit();
        }
    }

    //创建flywayjs使用的数据表
    private async prepare(){
        let t = await this.sequlize.transaction();
        await this.execJsOrTs(path.resolve(__dirname, './flyway-js.model'), t)
        await t.commit();
    }

    private async execSql(filepath: string, t: sequelize.Transaction) {
        let content = fs.readFileSync(filepath).toString();
        await this.sequlize.query(content, {raw: true, transaction: t});
    }

    private async execJsOrTs(filepath: string, t: sequelize.Transaction) {
        filepath = filepath.replace(/\.(js|ts)$/, '');
        let m = require(filepath);
        if (!m) {
            console.warn(filepath+" format not match flyway_js's require, ignored!");
            return;
        }
        if (m && m.default) {
            m = m.default;
        }
        if (typeof m !== 'function') {
            console.warn(filepath+" export default must be function, ex export default function(sequelize: Sequelize) => {}");
            return;
        }
        await m(this.sequlize, t);
        // console.debug(`执行js or ts文件`, filepath);
    }

    private async storeSqlExecLog(filename: string, filepath: string, t?: sequelize.Transaction) {
        let hash = await this.getFileHash(filepath);
        let item = Models.FlywayJsModel.build({filename, hash});
        return item.save({transaction: t});
    }

    private async hasExec(file: string, filepath: string) :Promise<boolean> {
        let hash = await this.getFileHash(filepath);
        let flywayModel = await Models.FlywayJsModel.findOne({where: {filename: file}});
        if (flywayModel){
            if (flywayModel.hash != hash && !/^R_/.test(file)) {
                throw new Error(file+`hash conflict ${flywayModel.hash} != ${hash}`)
            }
            return true;
        }
        return false;
    }

    private async getFileHash(filepath: string) {
        let content = fs.readFileSync(filepath)
        return crypto.createHash('md5').update(content.toString()).digest('hex');
    }

    private isNeedIgnore(file: string, ignores?: (RegExp| string)[]) :boolean {
        if (!ignores) {
            ignores = [/\.js\.map$/, /\.d\.ts$/];
        }
        let ret = false;
        for(let ignore of ignores) {
            if (typeof ignore == 'string' && file == ignore) {
                ret = true;
                break;
            }
            if (ignore instanceof RegExp && ignore.test(file)) {
                ret = true;
                break;
            }
        }
        return ret;
    }
}