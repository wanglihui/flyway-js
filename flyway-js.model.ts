import {Sequelize, DataTypes} from "sequelize";
import {Models} from "./models";
import {Transaction} from "sequelize";


export default async function (sequelize: Sequelize, _: Transaction) {
    const FlywayJsModel = sequelize.define('flyway_js', {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
        },
        filename: {
            type: DataTypes.STRING(255),
        },
        hash: {
            type: DataTypes.STRING(32),
        }
    }, {
        timestamps: true
    });
    await FlywayJsModel.sync({force: false});
    Models.FlywayJsModel = FlywayJsModel;
    return FlywayJsModel;
}