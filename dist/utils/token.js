"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodedTokenAndFetchUser = exports.GetSignature = exports.TokenType = exports.VerifyToken = exports.GenerateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const classError_1 = require("./classError");
const user_repository_1 = require("../DB/repositories/user.repository");
const user_model_1 = __importDefault(require("../DB/model/user.model"));
const revokeToken_repository_1 = require("../DB/repositories/revokeToken.repository");
const revokeToken_1 = __importDefault(require("../DB/model/revokeToken"));
const GenerateToken = async ({ payload, signature, options }) => {
    return jsonwebtoken_1.default.sign(payload, signature, options);
};
exports.GenerateToken = GenerateToken;
const VerifyToken = async ({ token, signature }) => {
    return jsonwebtoken_1.default.verify(token, signature);
};
exports.VerifyToken = VerifyToken;
var TokenType;
(function (TokenType) {
    TokenType["access"] = "access";
    TokenType["refresh"] = "refresh";
})(TokenType || (exports.TokenType = TokenType = {}));
const _userModel = new user_repository_1.UserRepository(user_model_1.default);
const _revokeToken = new revokeToken_repository_1.RevokeTokenRepository(revokeToken_1.default);
const GetSignature = async (tokenType, prefix) => {
    if (tokenType === TokenType.access) {
        if (prefix === process.env.BEARER_USER) {
            return process.env.ACCESS_TOKEN_USER;
        }
        else if (prefix === process.env.BEARER_ADMIN) {
            return process.env.ACCESS_TOKEN_ADMIN;
        }
        else {
            return null;
        }
    }
    if (tokenType === TokenType.refresh) {
        if (prefix === process.env.BEARER_USER) {
            return process.env.REFRESH_TOKEN_USER;
        }
        else if (prefix === process.env.BEARER_ADMIN) {
            return process.env.REFRESH_TOKEN_ADMIN;
        }
        else {
            return null;
        }
    }
    return null;
};
exports.GetSignature = GetSignature;
const decodedTokenAndFetchUser = async (token, signature) => {
    const decoded = await (0, exports.VerifyToken)({ token, signature });
    if (!decoded) {
        throw new classError_1.AppError("InValid Token", 400);
    }
    const user = await _userModel.findOne({ email: decoded?.email });
    if (!user) {
        throw new classError_1.AppError("user not exist!", 404);
    }
    if (!user?.confirmed) {
        throw new classError_1.AppError("Please confirm email first! or Freezed", 404);
    }
    if (await _revokeToken.findOne({ tokenId: decoded?.jti })) {
        throw new classError_1.AppError("Token has been Revoked", 401);
    }
    if (user?.changeCredentials?.getTime() > decoded?.iat * 1000) {
        throw new classError_1.AppError("Token has been Revoked", 401);
    }
    return { decoded, user };
};
exports.decodedTokenAndFetchUser = decodedTokenAndFetchUser;
