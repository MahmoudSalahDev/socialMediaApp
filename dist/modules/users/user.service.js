"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const user_model_1 = __importStar(require("../../DB/model/user.model"));
const user_repository_1 = require("../../DB/repositories/user.repository");
const classError_1 = require("../../utils/classError");
const hash_1 = require("../../utils/hash");
const event_1 = require("../../utils/event");
const sendEmail_1 = require("../../service/sendEmail");
const token_1 = require("../../utils/token");
class UserService {
    _userModel = new user_repository_1.UserRepository(user_model_1.default);
    constructor() { }
    signUp = async (req, res, next) => {
        let { userName, email, password, cPassword, age, address, phone, gender } = req.body;
        if (await this._userModel.findOne({ email })) {
            throw new classError_1.AppError("Email already exists!!!!", 409);
        }
        const hash = await (0, hash_1.Hash)(password);
        const otp = await (0, sendEmail_1.generateOTP)();
        const hashedOtp = await (0, hash_1.Hash)(String(otp));
        const user = await this._userModel.createOneUser({
            userName,
            otp: hashedOtp,
            email,
            password: hash,
            age,
            address,
            phone,
            gender,
        });
        event_1.eventEmmiter.emit("confirmEmail", { email, otp });
        return res.status(201).json({ message: "User created successfully 👍", user });
    };
    confirmEmail = async (req, res, next) => {
        const { email, otp } = req.body;
        const user = await this._userModel.findOne({ email, confirmed: { $exists: false } });
        if (!user) {
            throw new classError_1.AppError("Email Not Found or already confirmed!!!!", 404);
        }
        if (!await (0, hash_1.Compare)(otp, user?.otp)) {
            throw new classError_1.AppError("Invalid OTP!!!!", 400);
        }
        await this._userModel.updateOne({ email: user?.email }, { confirmed: true, $unset: { otp: "" } });
        return res.status(200).json({ message: "Email confirmed successfully👌" });
    };
    signIn = async (req, res, next) => {
        const { email, password } = req.body;
        const user = await this._userModel.findOne({ email, confirmed: true });
        if (!user) {
            throw new classError_1.AppError("Email Not Found or Not confirmed!!!!", 404);
        }
        if (!await (0, hash_1.Compare)(password, user?.password)) {
            throw new classError_1.AppError("Invalid Password!!", 404);
        }
        const access_token = await (0, token_1.GenerateToken)({
            payload: { id: user._id, email },
            signature: user.role == user_model_1.RoleType.user ? process.env.ACCESS_TOKEN_USER : process.env.ACCESS_TOKEN_ADMIN,
            options: { expiresIn: "1h" }
        });
        const refresh_token = await (0, token_1.GenerateToken)({
            payload: { id: user._id, email },
            signature: user.role == user_model_1.RoleType.user ? process.env.REFRESH_TOKEN_USER : process.env.REFRESH_TOKEN_ADMIN,
            options: { expiresIn: "1y" }
        });
        return res.status(200).json({ message: "User logged in successfully", access_token, refresh_token });
    };
}
exports.default = new UserService();
