import { NextFunction, Request, Response } from "express";
import userModel, { ProviderType, RoleType } from "../../DB/model/user.model";
import { confirmEmailSchemaType, FlagType, forgetPasswordSchemaType, loginWithGmailSchemaType, logOutSchemaType, resetPasswordSchemaType, signInSchemaType, signUpSchemaType } from "./user.validation";
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

class UserService {
  private _userModel = new UserRepository(userModel);
  private _revokeToken = new RevokeTokenRepository(RevokeTokenModel);

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

    const { email, password }: signInSchemaType = req.body
    const user = await this._userModel.findOne({ email, confirmed: { $exists: true }, provider: ProviderType.system })
    if (!user) {
      throw new AppError("Email Not Found or Not confirmed or invalid provider!!!!", 404);
    }

    if (!await Compare(password, user?.password)) {
      throw new AppError("Invalid Password!!", 404)
    }

    const jwtid = uuidv4()
    // create token 
    const access_token = await GenerateToken({
      payload: { id: user._id, email },
      signature: user.role == RoleType.user ? process.env.ACCESS_TOKEN_USER! : process.env.ACCESS_TOKEN_ADMIN!,
      options: { expiresIn: "1h", jwtid }
    })
    const refresh_token = await GenerateToken({
      payload: { id: user._id, email },
      signature: user.role == RoleType.user ? process.env.REFRESH_TOKEN_USER! : process.env.REFRESH_TOKEN_ADMIN!,
      options: { expiresIn: "1y", jwtid }
    })

    return res.status(200).json({ message: "User logged in successfully", access_token, refresh_token });
  };

  //=============get profile============
  getProfile = async (req: Request, res: Response, next: NextFunction) => {



    return res.status(200).json({ message: "Success", user: req?.user });
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
        image: picture!,
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
    const { email , otp , password , cPassword }: resetPasswordSchemaType = req.body

    const user = await this._userModel.findOne({ email, otp: { $exists: true } })
    if (!user) {
      throw new AppError("User Not Found !!!!", 404);
    }


    if(!await Compare(otp,user?.otp!)){
      throw new AppError("Invalid OTP",400)
    }

        const hash = await Hash(password);

    await this._userModel.updateOne({ email: user?.email }, { password: hash , $unset:{otp:""} })

    return res.status(200).json({ message: "Success" });
  };

  uploadImage = async (req: Request, res: Response, next: NextFunction) => {
    // const upload = multerCloud()
    // upload.single("image")

    // const key= await uploadFiles({
    //   files: req.files as Express.Multer.File[],
    //   path:`users/${req.user?._id}`,
    //   storeType: storageEnum.disk
    // })

const {ContentType , originalname} = req.body
    const url= await createUploadFilePresignedUrl({
      originalname,
      ContentType,
      path:`users/${req.user?._id}`
    })

    return res.status(200).json({ message: "Success" , url});
  };


}

export default new UserService();
