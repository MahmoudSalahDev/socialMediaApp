"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizationGraphQL = exports.Authorization = void 0;
const classError_1 = require("../utils/classError");
const graphql_1 = require("graphql");
const Authorization = ({ accessRoles = [] }) => {
    return (req, res, next) => {
        if (!accessRoles.includes(req?.user?.role)) {
            throw new classError_1.AppError("Unauthorized!!😡", 401);
        }
        next();
    };
};
exports.Authorization = Authorization;
const AuthorizationGraphQL = ({ accessRoles = [], role }) => {
    if (!accessRoles.includes(role)) {
        throw new graphql_1.GraphQLError("Unauthorized!!😡", {
            extensions: {
                message: "Unauthorized!!😡",
                statusCode: 401
            }
        });
    }
    return true;
};
exports.AuthorizationGraphQL = AuthorizationGraphQL;
