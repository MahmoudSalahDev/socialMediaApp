"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEmailSchema = exports.updateProfileSchema = exports.updatePasswordSchema = exports.logOutSchema = exports.forgetPasswordSchema = exports.signInSchema = exports.loginWithGmailSchema = exports.resetPasswordSchema = exports.unfreezeAccountSchema = exports.freezeAccountSchema = exports.confirmEmailSchema = exports.signUpSchema = exports.getOneUserSchema = exports.FlagType = void 0;
const zod_1 = __importDefault(require("zod"));
const user_model_1 = require("../../DB/model/user.model");
const mongoose_1 = require("mongoose");
const generalRules_1 = require("../../utils/generalRules");
var FlagType;
(function (FlagType) {
    FlagType["all"] = "all";
    FlagType["current"] = "current";
})(FlagType || (exports.FlagType = FlagType = {}));
exports.getOneUserSchema = zod_1.default.strictObject({
    id: generalRules_1.generalRules.id
}).required();
const passRegex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,}$/;
exports.signUpSchema = {
    body: zod_1.default.object({
        userName: zod_1.default.string().min(2).max(15).trim(),
        email: zod_1.default.email(),
        password: zod_1.default.string(),
        cPassword: zod_1.default.string(),
        age: zod_1.default.number().min(18).max(65),
        address: zod_1.default.string(),
        phone: zod_1.default.string(),
        gender: zod_1.default.enum([user_model_1.GenderType.male, user_model_1.GenderType.female]),
    }).required().superRefine((data, ctx) => {
        if (data.password !== data.cPassword) {
            ctx.addIssue({ code: "custom", path: ["cPassword"], message: "password and cPassword do not match!!" });
        }
    })
};
exports.confirmEmailSchema = {
    body: zod_1.default.object({
        email: zod_1.default.email(),
        otp: zod_1.default.string().regex(/^\d{6}$/).trim()
    }).required()
};
exports.freezeAccountSchema = {
    params: zod_1.default.strictObject({
        userId: zod_1.default.string().optional(),
    }).required().refine((value) => {
        return value?.userId ? mongoose_1.Types.ObjectId.isValid(value.userId) : true;
    }, {
        message: "userId is required",
        path: ["userId"]
    })
};
exports.unfreezeAccountSchema = {
    params: zod_1.default.strictObject({
        userId: zod_1.default.string(),
    }).required().refine((value) => {
        return value?.userId ? mongoose_1.Types.ObjectId.isValid(value.userId) : true;
    }, {
        message: "userId is required",
        path: ["userId"]
    })
};
exports.resetPasswordSchema = {
    body: exports.confirmEmailSchema.body.extend({
        password: zod_1.default.string(),
        cPassword: zod_1.default.string(),
    }).required().superRefine((data, ctx) => {
        if (data.password !== data.cPassword) {
            ctx.addIssue({ code: "custom", path: ["cPassword"], message: "password and cPassword do not match!!" });
        }
    })
};
exports.loginWithGmailSchema = {
    body: zod_1.default.object({
        idToken: zod_1.default.string(),
    }).required()
};
exports.signInSchema = {
    body: zod_1.default.object({
        email: zod_1.default.email(),
        password: zod_1.default.string(),
    }).required()
};
exports.forgetPasswordSchema = {
    body: zod_1.default.object({
        email: zod_1.default.email(),
    }).required()
};
exports.logOutSchema = {
    body: zod_1.default.object({
        flag: zod_1.default.enum(FlagType),
    }).required()
};
exports.updatePasswordSchema = {
    body: zod_1.default.object({
        oldPassword: zod_1.default.string(),
        newPassword: zod_1.default.string(),
        cPassword: zod_1.default.string(),
    })
        .required()
        .superRefine((data, ctx) => {
        if (data.newPassword !== data.cPassword) {
            ctx.addIssue({
                code: "custom",
                path: ["cPassword"],
                message: "newPassword and cPassword do not match!!",
            });
        }
    }),
};
exports.updateProfileSchema = {
    body: zod_1.default.object({
        userName: zod_1.default.string().min(2).max(30).optional(),
        phone: zod_1.default.string().optional(),
        gender: zod_1.default.enum([user_model_1.GenderType.male, user_model_1.GenderType.female]).optional(),
        age: zod_1.default.number().min(18).max(65).optional(),
    }).refine((data) => {
        return data.userName || data.phone || data.gender || data.age;
    }, {
        message: "You must provide at least one field to update",
    })
};
exports.updateEmailSchema = {
    body: zod_1.default.object({
        email: zod_1.default.email(),
    }).required()
};
