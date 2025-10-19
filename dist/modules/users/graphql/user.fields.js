"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const user_service_1 = __importDefault(require("../user.service"));
const user_type_1 = require("./user.type");
const user_args_1 = require("./user.args");
class UserFields {
    constructor() { }
    query = () => {
        return {
            getOneUser: {
                type: user_type_1.userType,
                args: {
                    id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID) }
                },
                resolve: user_service_1.default.getOneUser
            },
            getAllUser: {
                type: new graphql_1.GraphQLList(user_type_1.userType),
                resolve: user_service_1.default.getAllUser
            },
        };
    };
    mutation = () => {
        return {
            createUser: {
                type: user_type_1.userType,
                args: user_args_1.createUserArgs,
                resolve: user_service_1.default.createUser
            }
        };
    };
}
exports.default = new UserFields();
