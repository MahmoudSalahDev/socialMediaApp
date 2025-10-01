import { EventEmitter } from "events"
import { generateOTP, sendEmail } from "../service/sendEmail"
import { emailTemplate } from "../service/email.template"
import { deleteFile, getFile } from "./s3.config"
import { UserRepository } from "../DB/repositories/user.repository"
import userModel from "../DB/model/user.model"

export const eventEmmiter = new EventEmitter()

eventEmmiter.on("confirmEmail", async (data) => {
    const { email, otp } = data


    await sendEmail({ to: email, subject: "Confirm Email", html: emailTemplate(otp, "Email Confirmation") })

})

eventEmmiter.on("forgetPassword", async (data) => {
    const { email, otp } = data


    await sendEmail({ to: email, subject: "forgetPassword", html: emailTemplate(otp, "forgetPassword") })

})


eventEmmiter.on("UploadProfileImage", async (data) => {
    const { expiresIn, Key, oldKey, userId } = data

    const _userModel = new UserRepository(userModel);


    setTimeout(async () => {


        try {
            await getFile({ Key })
            await _userModel.findOneAndUpdate({
                _id: userId
            }, {
                $unset: { tempProfileImage: "" }
            })
            if(oldKey){
                await deleteFile({Key:oldKey})
            }
        } catch (error: any) {
            console.log(error);
            if (error?.Code == 'NoSuchKey') {
                if (!oldKey) {
                    await _userModel.findOneAndUpdate({
                        _id: userId
                    }, {
                        $unset: { profileImage: "" }
                    })
                } else {
                    await _userModel.findOneAndUpdate({
                        _id: userId
                    }, {
                        $set: { profileImage: oldKey },
                        $unset: { tempProfileImage: "" }
                    })
                }
            }
        }



    }, expiresIn * 1000);
})
