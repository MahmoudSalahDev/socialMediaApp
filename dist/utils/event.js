"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventEmmiter = void 0;
const events_1 = require("events");
const sendEmail_1 = require("../service/sendEmail");
const email_template_1 = require("../service/email.template");
exports.eventEmmiter = new events_1.EventEmitter();
exports.eventEmmiter.on("confirmEmail", async (data) => {
    const { email, otp } = data;
    await (0, sendEmail_1.sendEmail)({ to: email, subject: "Confirm Email", html: (0, email_template_1.emailTemplate)(otp, "Email Confirmation") });
});
exports.eventEmmiter.on("forgetPassword", async (data) => {
    const { email, otp } = data;
    await (0, sendEmail_1.sendEmail)({ to: email, subject: "forgetPassword", html: (0, email_template_1.emailTemplate)(otp, "forgetPassword") });
});
