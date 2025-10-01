"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventEmmiter = void 0;
const events_1 = require("events");
const sendEmail_1 = require("../service/sendEmail");
const email_template_1 = require("../service/email.template");
const s3_config_1 = require("./s3.config");
const user_repository_1 = require("../DB/repositories/user.repository");
const user_model_1 = __importDefault(require("../DB/model/user.model"));
exports.eventEmmiter = new events_1.EventEmitter();
exports.eventEmmiter.on("confirmEmail", async (data) => {
    const { email, otp } = data;
    await (0, sendEmail_1.sendEmail)({ to: email, subject: "Confirm Email", html: (0, email_template_1.emailTemplate)(otp, "Email Confirmation") });
});
exports.eventEmmiter.on("forgetPassword", async (data) => {
    const { email, otp } = data;
    await (0, sendEmail_1.sendEmail)({ to: email, subject: "forgetPassword", html: (0, email_template_1.emailTemplate)(otp, "forgetPassword") });
});
exports.eventEmmiter.on("UploadProfileImage", async (data) => {
    const { expiresIn, Key, oldKey, userId } = data;
    const _userModel = new user_repository_1.UserRepository(user_model_1.default);
    setTimeout(async () => {
        try {
            await (0, s3_config_1.getFile)({ Key });
            await _userModel.findOneAndUpdate({
                _id: userId
            }, {
                $unset: { tempProfileImage: "" }
            });
            if (oldKey) {
                await (0, s3_config_1.deleteFile)({ Key: oldKey });
            }
        }
        catch (error) {
            console.log(error);
            if (error?.Code == 'NoSuchKey') {
                if (!oldKey) {
                    await _userModel.findOneAndUpdate({
                        _id: userId
                    }, {
                        $unset: { profileImage: "" }
                    });
                }
                else {
                    await _userModel.findOneAndUpdate({
                        _id: userId
                    }, {
                        $set: { profileImage: oldKey },
                        $unset: { tempProfileImage: "" }
                    });
                }
            }
        }
    }, expiresIn * 1000);
});
