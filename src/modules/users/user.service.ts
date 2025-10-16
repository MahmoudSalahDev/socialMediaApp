import { NextFunction, Request, Response } from "express";
import userModel, { ProviderType, RoleType } from "../../DB/model/user.model";
import { confirmEmailSchemaType, FlagType, forgetPasswordSchemaType, freezeAccountSchemaType, loginWithGmailSchemaType, logOutSchemaType, resetPasswordSchemaType, signInSchemaType, signUpSchemaType, updatePasswordSchemaType, updateProfileSchemaType } from "./user.validation";
import { UserRepository } from "../../DB/repositories/user.repository";
import { AppError } from "../../utils/classError";
import { Compare, Hash } from "../../utils/hash";
import { eventEmmiter } from "../../utils/event";
import { generateOTP } from "../../service/sendEmail";
import { GenerateToken } from "../../utils/token";
import { RevokeTokenRepository } from "../../DB/repositories/revokeToken.repository";
import RevokeTokenModel from "../../DB/model/revokeToken";
import { v4 as uuidv4 } from "uuid";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { multerCloud, storageEnum } from "../../middleware/multer.cloud";
import { createUploadFilePresignedUrl, uploadFile, uploadFiles, uploadLargeFile } from "../../utils/s3.config";
import { PostRepository } from "../../DB/repositories/post.repository";
import postModel from "../../DB/model/post.model";
import { FriendRequestRepository } from "../../DB/repositories/friendRequest.repository";
import friendRequestModel from "../../DB/model/friendRequest.model";
import { Schema } from "mongoose";
import { ChatRepository } from "../../DB/repositories/chat.repository";
import ChatModel from "../../DB/model/chat.model";


class UserService {
  private _userModel = new UserRepository(userModel);
  private _revokeToken = new RevokeTokenRepository(RevokeTokenModel);
  private _postModel = new PostRepository(postModel);
  private _chatModel = new ChatRepository(ChatModel);
  private _friendRequestModel = new FriendRequestRepository(friendRequestModel);

  constructor() { }

  //=============sign up============
  signUp = async (req: Request, res: Response, next: NextFunction) => {
    let { userName, email, password, cPassword, age, address, phone, gender }: signUpSchemaType = req.body;

    if (await this._userModel.findOne({ email })) {
      throw new AppError("Email already exists!!!!", 409);
    }

    const hash = await Hash(password);
    const otp = await generateOTP();
    const hashedOtp = await Hash(String(otp));

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

    eventEmmiter.emit("confirmEmail", { email, otp });

    return res.status(201).json({ message: "User created successfully 👍", user });
  };

  //=============confirm email============
  confirmEmail = async (req: Request, res: Response, next: NextFunction) => {

    const { email, otp }: confirmEmailSchemaType = req.body

    const user = await this._userModel.findOne({ email, confirmed: { $exists: false } })
    if (!user) {
      throw new AppError("Email Not Found or already confirmed!!!!", 404);
    }


    if (!await Compare(otp, user?.otp!)) {
      throw new AppError("Invalid OTP!!!!", 400);
    }

    await this._userModel.updateOne({ email: user?.email }, { confirmed: true, $unset: { otp: "" } })

    return res.status(200).json({ message: "Email confirmed successfully👌" });
  };

  //=============sign in============
  signIn = async (req: Request, res: Response, next: NextFunction) => {
    const { email, password }: signInSchemaType = req.body;

    const user = await this._userModel.findOne({
      email,
      confirmed: { $exists: true },
      provider: ProviderType.system,
    });

    if (!user) {
      throw new AppError(
        "Email Not Found or Not confirmed or invalid provider!!!!",
        404
      );
    }


    if (!(await Compare(password, user?.password))) {
      throw new AppError("Invalid Password!!", 404);
    }


    if (user.is2FAEnabled) {
      const otp = await generateOTP();
      const hashedOtp = await Hash(String(otp));

      user.tempOtp = hashedOtp;
      user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
      await user.save();

      eventEmmiter.emit("send2FA", { email: user.email, otp });

      return res.status(200).json({
        message: "2FA code sent to your email. Please verify to complete login.",
      });
    }

    const jwtid = uuidv4();

    const access_token = await GenerateToken({
      payload: { id: user._id, email },
      signature:
        user.role == RoleType.user
          ? process.env.ACCESS_TOKEN_USER!
          : process.env.ACCESS_TOKEN_ADMIN!,
      options: { expiresIn: "1h", jwtid },
    });

    const refresh_token = await GenerateToken({
      payload: { id: user._id, email },
      signature:
        user.role == RoleType.user
          ? process.env.REFRESH_TOKEN_USER!
          : process.env.REFRESH_TOKEN_ADMIN!,
      options: { expiresIn: "1y", jwtid },
    });

    return res
      .status(200)
      .json({ message: "User logged in successfully", access_token, refresh_token });
  };

  //=============get profile============
  getProfile = async (req: Request, res: Response, next: NextFunction) => {

    const user = await this._userModel.findOne({_id:req?.user?._id},undefined,{
      populate:[{
        path:'friends'
      }]
    })

    const groups = await this._chatModel.find({
      filter:{
        participants:{$in:[req?.user?._id]},
        group:{$exists:true}
      }
    })


    return res.status(200).json({ message: "Success", user , groups });
  };


  //=============Log Out============
  logOut = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { flag }: logOutSchemaType = req.body;

      // logout from all devices
      if (flag === FlagType.all) {
        await this._userModel.updateOne(
          { _id: req.user?._id },
          { changeCredentials: new Date() }
        );
        return res
          .status(200)
          .json({ message: "Success, logged out from all devices" });
      }

      // single-device logout
      const payload = (req.decoded as any)?.decoded ?? req.decoded;
      const jti = payload?.jti;
      const exp = payload?.exp;
      const userId = req.user?._id;

      if (!jti || !exp || !userId) {
        throw new AppError("Missing tokenId, exp, or userId", 400);
      }

      await this._revokeToken.create({
        tokenId: jti,
        userId,
        expireAt: new Date(exp * 1000),
      });

      return res
        .status(200)
        .json({ message: "Success, logged out from this device" });
    } catch (err) {
      next(err);
    }
  };



  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) throw new AppError("User not found in request", 401);

      const payload = (req.decoded as any)?.decoded ?? req.decoded;
      const oldJti = payload?.jti;
      const oldExp = payload?.exp;

      if (!oldJti || !oldExp) {
        throw new AppError("Missing jti/exp in current refresh token", 400);
      }

      await this._revokeToken.create({
        tokenId: oldJti,
        userId: user._id,
        expireAt: new Date(oldExp * 1000),
      });

      const newJti = uuidv4();

      const access_token = await GenerateToken({
        payload: { id: user._id, email: user.email },
        signature:
          user.role === RoleType.user
            ? process.env.ACCESS_TOKEN_USER!
            : process.env.ACCESS_TOKEN_ADMIN!,
        options: { expiresIn: "1h", jwtid: newJti },
      });

      const refresh_token = await GenerateToken({
        payload: { id: user._id, email: user.email },
        signature:
          user.role === RoleType.user
            ? process.env.REFRESH_TOKEN_USER!
            : process.env.REFRESH_TOKEN_ADMIN!,
        options: { expiresIn: "1y", jwtid: newJti },
      });

      return res
        .status(200)
        .json({ message: "Success", access_token, refresh_token });
    } catch (err) {
      next(err);
    }
  };


  loginWithGmail = async (req: Request, res: Response, next: NextFunction) => {
    const { idToken }: loginWithGmailSchemaType = req.body

    const client = new OAuth2Client();
    async function verify() {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.WEB_CLIENT_ID!,
      });
      const payload = ticket.getPayload();

      return payload
    }
    const { email, email_verified, name, picture } = await verify() as TokenPayload


    let user = await this._userModel.findOne({ email })
    if (!user) {
      user = await this._userModel.create({
        userName: name!,
        email: email!,
        confirmed: email_verified!,
        profileImage: picture!,
        password: uuidv4()!,
        provider: ProviderType.google!
      })
    }

    if (user?.provider === ProviderType.system) {
      throw new AppError("please log in on system", 404);
    }


    const newJti = uuidv4();

    const access_token = await GenerateToken({
      payload: { id: user._id, email: user.email },
      signature:
        user.role === RoleType.user
          ? process.env.ACCESS_TOKEN_USER!
          : process.env.ACCESS_TOKEN_ADMIN!,
      options: { expiresIn: "1h", jwtid: newJti },
    });

    const refresh_token = await GenerateToken({
      payload: { id: user._id, email: user.email },
      signature:
        user.role === RoleType.user
          ? process.env.REFRESH_TOKEN_USER!
          : process.env.REFRESH_TOKEN_ADMIN!,
      options: { expiresIn: "1y", jwtid: newJti },
    });

    return res.status(200).json({ message: "success", access_token, refresh_token })

  }


  //=============forget Password============
  forgetPassword = async (req: Request, res: Response, next: NextFunction) => {
    const { email }: forgetPasswordSchemaType = req.body

    const user = await this._userModel.findOne({ email, confirmed: { $exists: true } })
    if (!user) {
      throw new AppError("Email Not Found or Not confirmed!!!!", 404);
    }

    const otp = await generateOTP()
    const hashedOtp = await Hash(String(otp));
    eventEmmiter.emit("forgetPassword", { email, otp });

    await this._userModel.updateOne({ email: user?.email }, { otp: hashedOtp })

    return res.status(200).json({ message: "Success to Send OTP", });
  };

  //=============reset Password============
  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    const { email, otp, password, cPassword }: resetPasswordSchemaType = req.body

    const user = await this._userModel.findOne({ email, otp: { $exists: true } })
    if (!user) {
      throw new AppError("User Not Found !!!!", 404);
    }


    if (!await Compare(otp, user?.otp!)) {
      throw new AppError("Invalid OTP", 400)
    }

    const hash = await Hash(password);

    await this._userModel.updateOne({ email: user?.email }, { password: hash, $unset: { otp: "" } })

    return res.status(200).json({ message: "Success" });
  };

  uploadImage = async (req: Request, res: Response, next: NextFunction) => {
    const { ContentType, originalname } = req.body
    const { url, Key } = await createUploadFilePresignedUrl({
      originalname,
      ContentType,
      path: `users/${req.user?._id}`
    })


    const user = await this._userModel.findOneAndUpdate({
      _id: req.user?._id
    }, {
      profileImage: Key,
      tempProfileImage: req.user?.profileImage
    })

    if (!user) {
      throw new AppError("User Not Found !!!!", 404);
    }

    eventEmmiter.emit("UploadProfileImage", { userId: req.user?._id, oldKey: req.user?.profileImage, Key, expiresIn: 60 })

    return res.status(200).json({ message: "Success", url, user });
  };


  // 
  freezeAccount = async (req: Request, res: Response, next: NextFunction) => {
    const { userId }: freezeAccountSchemaType = req.params as freezeAccountSchemaType

    if (userId && req.user?.role !== RoleType.admin) {
      throw new AppError("Unauthorized", 401)
    }

    const user = await this._userModel.findOneAndUpdate(
      { _id: userId || req.user?._id, deletedAt: { $exists: false } },
      { deletedAt: new Date(), deletedBy: req.user?._id, changeCredentials: new Date() }
    )

    if (!user) {
      throw new AppError("User Not Found !!!!", 404);
    }

    return res.status(200).json({ message: "Freezed" });
  };

  unfreezeAccount = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params

    if (req.user?.role !== RoleType.admin) {
      throw new AppError("Unauthorized", 401)
    }

    const user = await this._userModel.findOneAndUpdate(
      { _id: userId, deletedAt: { $exists: true }, deletedBy: { $ne: userId } },
      {
        $unset: { deletedAt: "", deletedBy: "" },
        restoredBy: req.user?._id,
        restoredAt: new Date()
      }
    )

    if (!user) {
      throw new AppError("User Not Found !!!!", 404);
    }

    return res.status(200).json({ message: "unFreezed" });
  };

  updatePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword }: updatePasswordSchemaType = req.body as updatePasswordSchemaType;


      if (!req.user) {
        throw new AppError("Unauthorized", 401);
      }


      const isMatch = await Compare(oldPassword, req.user.password);
      if (!isMatch) {
        throw new AppError("Invalid Old Password", 400);
      }


      const hash = await Hash(newPassword);


      await this._userModel.updateOne(
        { _id: req.user._id },
        { password: hash, changeCredentials: new Date() }
      );

      return res.status(200).json({ message: "Password updated successfully 👍" });
    } catch (err) {
      next(err);
    }
  };


  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userName, phone, gender, age }: updateProfileSchemaType = req.body as updateProfileSchemaType;

      if (!req.user) {
        throw new AppError("Unauthorized", 401);
      }

      if (userName) req.user.userName = userName;
      if (gender) req.user.gender = gender;
      if (age) req.user.age = age;
      if (phone) req.user.phone = phone;

      await req.user.save();

      return res.status(200).json({
        message: "Profile updated successfully 👍",
        user: req.user,
      });
    } catch (err) {
      next(err);
    }
  };

  updateEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError("Email is required!", 400);
      }

      const exists = await this._userModel.findOne({ email });
      if (exists) {
        throw new AppError("Email Already Exists!", 400);
      }

      const otp = await generateOTP();
      const hashedOtp = await Hash(String(otp));

      eventEmmiter.emit("confirmEmail", { email, otp });

      if (req.user) {
        req.user.email = email;
      }
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      req.user.otp = hashedOtp;

      req.user.confirmed = false;

      await req.user.save();

      return res.status(200).json({ message: "Email updated, please confirm OTP" });
    } catch (err) {
      next(err);
    }
  };


  enable2FA = async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const otp = generateOTP();
    const hashedOtp = await Hash(String(otp));

    req.user.tempOtp = hashedOtp;
    req.user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await req.user.save();

    eventEmmiter.emit("sendEmail", { email: req.user.email, otp });

    return res.status(200).json({ message: "OTP sent to your email" });
  };


  confirm2FA = async (req: Request, res: Response) => {
    const { otp } = req.body;
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const isValid = await Compare(otp, req.user.tempOtp!);
    if (!isValid || req.user.otpExpiry! < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    req.user.is2FAEnabled = true;
    req.user.tempOtp = undefined;
    req.user.otpExpiry = undefined;
    await req.user.save();

    return res.status(200).json({ message: "2FA enabled successfully ✅" });
  };

  dashBoard = async (req: Request, res: Response, next: NextFunction) => {

    const result = await Promise.allSettled([
      this._userModel.find({ filter: {} }),
      this._postModel.find({ filter: {} })
    ])

    // if (!user) {
    //   throw new AppError("User Not Found !!!!", 404);
    // }

    return res.status(200).json({ message: "success", result });
  };

  updateRole = async (req: Request, res: Response, next: NextFunction) => {

    const { userId } = req.params

    const { role: newRole } = req.body

    const denyRoles: RoleType[] = [newRole, RoleType.superAdmin]

    if (req?.user?.role == RoleType.admin) {
      denyRoles.push(RoleType.admin)
      if (newRole == RoleType.superAdmin) {
        throw new AppError("an admin can't update a role to be superAdmin", 404);
      }
    }
    const user = await this._userModel.findOneAndUpdate(
      { _id: userId, role: { $nin: denyRoles } },
      { role: newRole },
      { new: true })


    if (!user) {
      throw new AppError("User Not Found !!!!", 404);
    }



    return res.status(200).json({ message: "success", user });
  };

  sendRequest = async (req: Request, res: Response, next: NextFunction) => {

    const { userId } = req.params



    const user = await this._userModel.findOne({ _id: userId })
    if (!user) {
      throw new AppError("User Not Found !!!!", 404);
    }
    if (req?.user?._id == userId) {
      throw new AppError("U can't send friend request to yourself", 404);
    }

    const checkRequest = await this._friendRequestModel.findOne({
      createdBy: { $in: [req?.user?._id, userId] },
      sendTo: { $in: [req?.user?._id, userId] }
    })
    if (checkRequest) {
      throw new AppError("Request already exists!!", 400);
    }


    const friendRequest = await this._friendRequestModel.create({
      createdBy: req?.user?._id as unknown as Schema.Types.ObjectId,
      sendTo: userId as unknown as Schema.Types.ObjectId
    })




    return res.status(200).json({ message: "success", friendRequest });
  };

  acceptRequest = async (req: Request, res: Response, next: NextFunction) => {

    const { requestId } = req.params




    const checkRequest = await this._friendRequestModel.findOneAndUpdate({
      _id: requestId,
      sendTo: req?.user?._id,
      acceptedAt: { $exists: false }
    }, {
      acceptedAt: new Date()
    })
    if (!checkRequest) {
      throw new AppError("Request not found", 400);
    }

    await Promise.all([
      this._userModel.updateOne({ _id: checkRequest.createdBy }, { $push: { friends: checkRequest.sendTo } }),
      this._userModel.updateOne({ _id: checkRequest.sendTo }, { $push: { friends: checkRequest.createdBy } })
    ])







    return res.status(200).json({ message: "success" });
  };

  deleteFriendRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { requestId } = req.params;

      const friendRequest = await this._friendRequestModel.findOne({ _id: requestId });
      if (!friendRequest) {
        throw new AppError("Friend request not found!", 404);
      }

      const isAuthorized =
        friendRequest.createdBy.toString() === req.user?._id.toString() ||
        friendRequest.sendTo.toString() === req.user?._id.toString();

      if (!isAuthorized) {
        throw new AppError("Unauthorized to delete this request!", 403);
      }

      const result = await this._friendRequestModel.deleteOne({ _id: requestId });

      if (result.deletedCount === 0) {
        throw new AppError("Failed to delete friend request!", 500);
      }

      return res.status(200).json({ message: "Friend request deleted successfully ✅" });
    } catch (error) {
      next(error);
    }
  };

  blockUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      if (req?.user?._id.toString() === userId) {
        throw new AppError("You can't block yourself!", 400);
      }

      const targetUser = await this._userModel.findOne({ _id: userId });
      if (!targetUser) {
        throw new AppError("User not found!", 404);
      }

      const currentUser = await this._userModel.findOne({
        _id: req.user?._id,
        blockedUsers: userId,
      });
      if (currentUser) {
        throw new AppError("User already blocked!", 400);
      }

      await this._userModel.updateOne(
        { _id: req.user?._id },
        { $addToSet: { blockedUsers: userId } }
      );

      await this._friendRequestModel.deleteMany({
        $or: [
          { createdBy: req.user?._id, sendTo: userId },
          { createdBy: userId, sendTo: req.user?._id },
        ],
      });

      await this._userModel.updateOne(
        { _id: req.user?._id },
        { $pull: { friends: userId } }
      );
      await this._userModel.updateOne(
        { _id: userId },
        { $pull: { friends: req.user?._id } }
      );

      return res.status(200).json({ message: "User blocked successfully ✅" });
    } catch (error) {
      next(error);
    }
  };

  unblockUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      if (req?.user?._id.toString() === userId) {
        throw new AppError("You can't unblock yourself!", 400);
      }

      const result = await this._userModel.updateOne(
        { _id: req.user?._id },
        { $pull: { blockedUsers: userId } }
      );

      if (result.modifiedCount === 0) {
        throw new AppError("User not found in blocked list!", 404);
      }

      return res.status(200).json({ message: "User unblocked successfully ✅" });
    } catch (error) {
      next(error);
    }
  };

  unFriend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      if (req?.user?._id.toString() === userId?.toString()) {
        throw new AppError("You cannot unfriend yourself", 400);
      }

      const [currentUser, targetUser] = await Promise.all([
        this._userModel.findOne({ _id: req?.user?._id }),
        this._userModel.findOne({ _id: userId }),
      ]);

      if (!currentUser) throw new AppError("Your account not found", 404);
      if (!targetUser) throw new AppError("User not found", 404);

      const currentFriends = Array.isArray(currentUser.friends)
        ? currentUser.friends
        : currentUser.friends
          ? [currentUser.friends]
          : [];

      const targetFriends = Array.isArray(targetUser.friends)
        ? targetUser.friends
        : targetUser.friends
          ? [targetUser.friends]
          : [];

      const currentFriendIds = currentFriends.map((f: any) =>
        f?._id?.toString?.() || f?.toString?.()
      );

      const targetFriendIds = targetFriends.map((f: any) =>
        f?._id?.toString?.() || f?.toString?.()
      );

      const areFriends =
        currentFriendIds.includes(userId?.toString()) ||
        targetFriendIds.includes(req?.user?._id.toString());

      if (!areFriends) {
        throw new AppError("You are not friends with this user", 400);
      }

      await Promise.all([
        this._userModel.updateOne(
          { _id: req?.user?._id },
          { $pull: { friends: userId } }
        ),
        this._userModel.updateOne(
          { _id: userId },
          { $pull: { friends: req?.user?._id } }
        ),
      ]);

      return res.status(200).json({ message: "Friend removed successfully ❌" });
    } catch (error) {
      next(error);
    }
  };









}

export default new UserService();


