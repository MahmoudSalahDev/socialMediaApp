import { EventEmitter } from "events"
import { generateOTP, sendEmail } from "../service/sendEmail"
import { emailTemplate } from "../service/email.template"

export const eventEmmiter = new EventEmitter()

eventEmmiter.on("confirmEmail", async (data) => {
    const { email ,otp } = data


    await sendEmail({ to: email, subject: "Confirm Email", html: emailTemplate(otp, "Email Confirmation") })

})

eventEmmiter.on("forgetPassword", async (data) => {
    const { email ,otp } = data


    await sendEmail({ to: email, subject: "forgetPassword", html: emailTemplate(otp, "forgetPassword") })

})