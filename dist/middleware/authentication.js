"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationGraphQL = exports.Authentication = void 0;
const classError_1 = require("../utils/classError");
const token_1 = require("../utils/token");
const graphql_1 = require("graphql");
const Authentication = (tokenType = token_1.TokenType.access) => {
    return async (req, res, next) => {
        const { authorization } = req.headers;
        const [prefix, token] = authorization?.split(" ") || [];
        if (!prefix || !token) {
            throw new classError_1.AppError("Token not exist!", 404);
        }
        const signature = await (0, token_1.GetSignature)(tokenType, prefix);
        if (!signature) {
            throw new classError_1.AppError("InValid signature", 400);
        }
        const decoded = await (0, token_1.decodedTokenAndFetchUser)(token, signature);
        if (!decoded) {
            throw new classError_1.AppError("InValid Token decoded", 400);
        }
        req.user = decoded?.user;
        req.decoded = decoded;
        return next();
    };
};
exports.Authentication = Authentication;
const AuthenticationGraphQL = async (authorization, tokenType = token_1.TokenType.access) => {
    const [prefix, token] = authorization?.split(" ") || [];
    if (!prefix || !token) {
        throw new graphql_1.GraphQLError("Token not exist!", {
            extensions: {
                message: "Token not exist!",
                statusCode: 404
            }
        });
    }
    const signature = await (0, token_1.GetSignature)(tokenType, prefix);
    if (!signature) {
        throw new graphql_1.GraphQLError("InValid signature", {
            extensions: {
                message: "InValid signature",
                statusCode: 400
            }
        });
    }
    const { user, decoded } = await (0, token_1.decodedTokenAndFetchUser)(token, signature);
    if (!decoded) {
        throw new graphql_1.GraphQLError("InValid Token decoded", {
            extensions: {
                message: "InValid Token decoded",
                statusCode: 400
            }
        });
    }
    return { user, decoded };
};
exports.AuthenticationGraphQL = AuthenticationGraphQL;
