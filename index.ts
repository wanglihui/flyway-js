import {Sequelize, Transaction} from "sequelize";
import * as path from 'path';
import * as fs from 'fs';
import * as sequelize from "sequelize";
import {Models} from './models';
import * as crypto from 'crypto';
import {setForce} from "./flyway-js.model";

export interface IFlywayOptions {
    /**
     * 是否检查脚本Hash
     * false - 不检查
     * true - 检查，修改过已执行的脚本，将不能执行flyway
     */
    allowHashNotMatch?: boolean,
    /**
     * baseline 以指定脚本之为基准建立数据库版本
     *
     * 如，工程中有脚本：
     * V001__t.sql
     * V002__t.sql
     * V003__t.sql
     * 如果指定了baseline=V002__t.sql
     * 在执行run()时，会忽略包括V001,V002两个文件，只执行V003。但是所有脚本都会记录到flyway_js表
     *
     * 默认为空，会从第一个脚本开始执行，建立数据库版本。
     * 注意，baseline只在首次创建flyway_js表时有效；
     */
    baseline?: string
}

/**
 * 脚本文件信息
 */
class ScriptFile {
    script : string ;
    isBaseline : boolean = false ;
    constructor(fileName, isBaseline) {
        this.script = fileName ;
        this.isBaseline = isBaseline ;
    }
}

export default class FlywayJs {

    public sequlize: Sequelize;

    constructor(public connect: string, public scriptDir?: string, forceInit?: boolean, public options?: IFlywayOptions) {
        this.sequlize = new Sequelize(connect, {
            dialectOptions: {
                statement_timeout: 10 * 1000,
                connectTimeout: 10 * 1000
            }
        });
        if (!scriptDir) {
            this.scriptDir = path.resolve(process.cwd(), 'sql');
        }
        if (!options) {
            this.options = Object.assign({}, {allowHashNotMatch: false, baseline: ""});
        }
        setForce(forceInit);
    }

    async run(ignores?: (RegExp|string)[]) {
        if (!fs.existsSync(this.scriptDir)) {
            return;
        }

        let scriptFiles = await this.scriptFile() ;
        await this.prepare();
        for(let file of scriptFiles) {
            if (this.isNeedIgnore(file.script, ignores)) {
                continue;
            }
            let filepath = path.resolve(this.scriptDir, file.script);
            //查找是否已经执行
            let t = await this.sequlize.transaction()
            try {
                if (await this.hasExec(file.script, filepath, t)) {
                    await t.commit()
                    continue;
                }
                if( !file.isBaseline){
                    console.log('need exec script file: ', file.script)
                    //执行sql文件
                    if (/\.sql$/.test(file.script)) {
                        await this.execSql(filepath, t);
                    }
                    //执行js或者ts
                    if (/\.(js|ts)$/.test(file.script)) {
                        await this.execJsOrTs(filepath, t);
                    }
                }else{
                    console.log('baseline script file: ', file.script)
                }
                await this.storeSqlExecLog(file.script, filepath, t);
                await t.commit();
            } catch(err) {
                await t.rollback();
                throw err;
            }
        }
    }

    private async scriptFile(){

        let files = fs.readdirSync(this.scriptDir);
        files.sort();
        // 获取基准脚本的位置
        let local = files.indexOf(this.options.baseline) ;
        let scriptFiles = new Array<ScriptFile>() ;
        files.forEach((file, index) =>{
            if(index <= local ){
                // 基准脚本和基准脚本之前的脚本都执行
                scriptFiles.push(new ScriptFile(file, true)) ;
            } else{
                scriptFiles.push(new ScriptFile(file, false)) ;
            }
        })
        scriptFiles.forEach(s=>{
            console.log( s )
        })
        return scriptFiles ;
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

    let temp = String(str).trim() ;

    if(temp == "null"){
        return [] ;
    }

    let arr = temp.split(!splitter?',':splitter);
    let back = [] ;
    arr.forEach((s,index) => {
        if( s ){
            back[index] = s.trim() + repair ;
        }
    })

    return back ;
}

