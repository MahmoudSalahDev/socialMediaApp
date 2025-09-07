import { Router } from "express";
import  US from "./user.service";
import { Validation } from "../../middleware/validation";
import * as UV from "./user.validation";

const userRouter = Router()



userRouter.post("/signUp",Validation(UV.signUpSchema) ,US.signUp)
userRouter.patch("/confirmEmail",Validation(UV.confirmEmailSchema) ,US.confirmEmail)
userRouter.post("/signIn",Validation(UV.signInSchema),US.signIn)




export default userRouter