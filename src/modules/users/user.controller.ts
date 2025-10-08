import { Router } from "express";
import US from "./user.service";
import { Validation } from "../../middleware/validation";
import * as UV from "./user.validation";
import { Authentication } from "../../middleware/authentication";
import { TokenType } from "../../utils/token";
import { multerCloud, storageEnum } from "../../middleware/multer.cloud";
import { Authorization } from "../../middleware/authorization";
import { RoleType } from "../../DB/model/user.model";

const userRouter = Router()



userRouter.post("/signUp", Validation(UV.signUpSchema), US.signUp)
userRouter.patch("/confirmEmail", Validation(UV.confirmEmailSchema), US.confirmEmail)
userRouter.post("/signIn", Validation(UV.signInSchema), US.signIn)
userRouter.post("/loginWithGmail", Validation(UV.loginWithGmailSchema), US.loginWithGmail)
userRouter.get("/profile", Authentication(), US.getProfile)
userRouter.post("/logout", Authentication(), Validation(UV.logOutSchema), US.logOut)
userRouter.get("/refreshToken", Authentication(TokenType.refresh), US.refreshToken)
userRouter.patch("/forgetPassword", Validation(UV.forgetPasswordSchema), US.forgetPassword)
userRouter.patch("/resetPassword", Validation(UV.resetPasswordSchema), US.resetPassword)
userRouter.delete("/freeze{/:userId}", Authentication(TokenType.access), Validation(UV.freezeAccountSchema), US.freezeAccount)
userRouter.patch("/unfreeze/:userId", Authentication(TokenType.access), Validation(UV.unfreezeAccountSchema), US.unfreezeAccount)



userRouter.post("/upload", Authentication(),
    // multerCloud({storeType:storageEnum.disk}).array("files"),
    US.uploadImage)

userRouter.patch(
    "/updatePassword",
    Authentication(TokenType.access),
    Validation(UV.updatePasswordSchema),
    US.updatePassword
);


userRouter.patch(
    "/updateProfile",
    Authentication(TokenType.access),
    Validation(UV.updateProfileSchema),
    US.updateProfile
);


userRouter.patch(
    "/updateEmail",
    Authentication(),
    Validation(UV.updateEmailSchema),
    US.updateEmail
);

// ================= 2FA =================
userRouter.post(
    "/enable-2fa",
    Authentication(TokenType.access),
    US.enable2FA
);

userRouter.post(
    "/confirm-2fa",
    Authentication(TokenType.access),
    US.confirm2FA
);

//-----------dash board---------------
userRouter.get(
    "/dashBoard",
    Authentication(),
    Authorization({ accessRoles: [RoleType.superAdmin, RoleType.admin] }),
    US.dashBoard
);

//-----------change role---------------
userRouter.patch(
    "/updateRole/:userId",
    Authentication(),
    Authorization({ accessRoles: [RoleType.superAdmin, RoleType.admin] }),
    US.updateRole
);

//-----------add friend---------------
userRouter.post(
    "/sendRequest/:userId",
    Authentication(),
    US.sendRequest
);


//-----------acceptRequest---------------
userRouter.patch(
    "/acceptRequest/:requestId",
    Authentication(),
    US.acceptRequest
);

userRouter.delete("/deleteRequest/:requestId",
    Authentication(),
    US.deleteFriendRequest);


userRouter.patch("/:userId/block", Authentication(), US.blockUser);
userRouter.patch("/:userId/unblock", Authentication(), US.unblockUser);


userRouter.delete(
  "/unfriend/:userId",
  Authentication(),
  US.unFriend
);

export default userRouter