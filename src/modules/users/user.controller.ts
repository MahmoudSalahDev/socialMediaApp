import { Router } from "express";
import  US from "./user.service";
import { Validation } from "../../middleware/validation";
import * as UV from "./user.validation";
import { Authentication } from "../../middleware/authentication";
import { TokenType } from "../../utils/token";

const userRouter = Router()



userRouter.post("/signUp",Validation(UV.signUpSchema) ,US.signUp)
userRouter.patch("/confirmEmail",Validation(UV.confirmEmailSchema) ,US.confirmEmail)
userRouter.post("/signIn",Validation(UV.signInSchema),US.signIn)
userRouter.post("/loginWithGmail",Validation(UV.loginWithGmailSchema),US.loginWithGmail)
userRouter.get("/profile",Authentication(),US.getProfile)
userRouter.post("/logout",Authentication(),Validation(UV.logOutSchema),US.logOut)
userRouter.get("/refreshToken",Authentication(TokenType.refresh),US.refreshToken)
userRouter.patch("/forgetPassword",Validation(UV.forgetPasswordSchema),US.forgetPassword)
userRouter.patch("/resetPassword",Validation(UV.resetPasswordSchema),US.resetPassword)




export default userRouter