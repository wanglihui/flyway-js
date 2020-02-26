import {Sequelize, Transaction} from "sequelize";
import * as path from 'path';
import * as fs from 'fs';
import * as sequelize from "sequelize";
import {Models} from './models';
import * as crypto from 'crypto';
import {setForce} from "./flyway-js.model";

export interface IFlywayOptions {
    allowHashNotMatch: boolean
}

export default class FlywayJs {

    public sequlize: Sequelize;

    constructor(public connect: string, public scriptDir?: string, forceInit?: boolean, public options?: IFlywayOptions) {
        this.sequlize = new Sequelize(connect);
        if (!scriptDir) {
            this.scriptDir = path.resolve(process.cwd(), 'sql');
        }
        if (!options) {
            this.options = Object.assign({}, {allowHashNotMatch: false});
        }
        setForce(forceInit);
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
            let t = await this.sequlize.transaction()
            try {
                if (await this.hasExec(file, filepath, t)) {
                    await t.commit()
                    continue;
                }
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
            } catch(err) {
                await t.rollback();
                throw err;
            }
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
        let arr = slipt2Array(content, ';', ';');
        let index = 0 ;
        for ( let s of arr ) {
            await this.execOnePart(s, index, t);
            index ++ ;
        }
    }

    private execOnePart(s: string, index: number, t: sequelize.Transaction){
        return new Promise(async (resolve, reject) => {
            console.log('exec sql: ', index);
            try {
                await this.sequlize.query(s, {raw: true, transaction: t});
            } catch (err) {
                console.log('exec sql error ： ', err.message);
                await t.rollback();
                throw err;
            }
            resolve();
        });
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

    private async hasExec(file: string, filepath: string, t: Transaction) :Promise<boolean> {
        let hash = await this.getFileHash(filepath);
        let flywayModel = await Models.FlywayJsModel.findOne({where: {filename: file}, transaction: t});
        if (flywayModel){
            if (flywayModel.hash != hash && !/^R_/.test(file) && this.options.allowHashNotMatch === false) {
                throw new Error(file+`hash conflict ${flywayModel.hash} != ${hash}`)
            }
            return true;
        }
        return false;
    }

    private async getFileHash(filepath: string) {
        let content = fs.readFileSync(filepath).toString();
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


/**
 * 将字符串分割为数组
 * @param {string} str 字符串
 * @param {string} splitter 分隔符，默认','
 * @param {string} repair 尾补符号，分割后的字符串尾部增补符号，默认无尾补符号
 */
function slipt2Array( str, splitter, repair='' ){

    if(! str ){
        return [] ;
    }

    let temp = String(str). trim() ;

    if(temp == "null"){
        return [] ;
    }

    let arr = temp.split(!splitter?',':splitter);
    let back = [] ;
    arr.forEach((s,index) => {
        if( s ){
            back[index] = s + repair ;
        }
    })

    return back ;
}

