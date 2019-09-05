import {Sequelize, Transaction} from "sequelize";
export default function (sequelize: Sequelize, t: Transaction) {
    return sequelize.query('SELECT 4; SELECT 5;', {raw: true, transaction: t});
}