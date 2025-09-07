import { NextFunction, Request, Response } from "express";
import userModel, { RoleType } from "../../DB/model/user.model";
import { confirmEmailSchemaType, signInSchemaType, signUpSchemaType } from "./user.validation";
import { UserRepository } from "../../DB/repositories/user.repository";
import { AppError } from "../../utils/classError";
import { Compare, Hash } from "../../utils/hash";
import { eventEmmiter } from "../../utils/event";
import { generateOTP } from "../../service/sendEmail";
import { GenerateToken } from "../../utils/token";

class UserService {
  private _userModel = new UserRepository(userModel);

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
    const user = await this._userModel.findOne({ email, confirmed: true })
    if (!user) {
      throw new AppError("Email Not Found or Not confirmed!!!!", 404);
    }

    if (!await Compare(password, user?.password)) {
      throw new AppError("Invalid Password!!", 404)
    }

       // create token 
        const access_token = await GenerateToken({
            payload: { id: user._id, email },
            signature: user.role == RoleType.user ? process.env.ACCESS_TOKEN_USER! : process.env.ACCESS_TOKEN_ADMIN!,
            options: { expiresIn: "1h" }
        })
        const refresh_token = await GenerateToken({
            payload: { id: user._id, email },
            signature: user.role == RoleType.user ? process.env.REFRESH_TOKEN_USER! : process.env.REFRESH_TOKEN_ADMIN!,
            options: { expiresIn: "1y" }
        })

    return res.status(200).json({ message: "User logged in successfully" , access_token , refresh_token});
  };
}

export default new UserService();
