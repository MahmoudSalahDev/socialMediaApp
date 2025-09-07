"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signInSchema = exports.confirmEmailSchema = exports.signUpSchema = void 0;
const zod_1 = __importDefault(require("zod"));
const user_model_1 = require("../../DB/model/user.model");
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
exports.signInSchema = {
    body: zod_1.default.object({
        email: zod_1.default.email(),
        password: zod_1.default.string(),
    }).required()
};
