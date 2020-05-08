import {Sequelize, Transaction} from "sequelize";
export default function (sequelize: Sequelize, t: Transaction) {
    // ts或js也还不支持多组SQL脚本
    // return sequelize.query('SELECT 4; SELECT 5;', {raw: true, transaction: t});
    return sequelize.query('SELECT 4;', {raw: true, transaction: t});
}