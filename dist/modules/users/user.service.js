"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_model_1 = __importStar(require("../../DB/model/user.model"));
const user_validation_1 = require("./user.validation");
const user_repository_1 = require("../../DB/repositories/user.repository");
const classError_1 = require("../../utils/classError");
const hash_1 = require("../../utils/hash");
const event_1 = require("../../utils/event");
const sendEmail_1 = require("../../service/sendEmail");
const token_1 = require("../../utils/token");
const revokeToken_repository_1 = require("../../DB/repositories/revokeToken.repository");
const revokeToken_1 = __importDefault(require("../../DB/model/revokeToken"));
const uuid_1 = require("uuid");
const google_auth_library_1 = require("google-auth-library");
const s3_config_1 = require("../../utils/s3.config");
const post_repository_1 = require("../../DB/repositories/post.repository");
const post_model_1 = __importDefault(require("../../DB/model/post.model"));
const friendRequest_repository_1 = require("../../DB/repositories/friendRequest.repository");
const friendRequest_model_1 = __importDefault(require("../../DB/model/friendRequest.model"));
const chat_repository_1 = require("../../DB/repositories/chat.repository");
const chat_model_1 = __importDefault(require("../../DB/model/chat.model"));
class UserService {
    _userModel = new user_repository_1.UserRepository(user_model_1.default);
    _revokeToken = new revokeToken_repository_1.RevokeTokenRepository(revokeToken_1.default);
    _postModel = new post_repository_1.PostRepository(post_model_1.default);
    _chatModel = new chat_repository_1.ChatRepository(chat_model_1.default);
    _friendRequestModel = new friendRequest_repository_1.FriendRequestRepository(friendRequest_model_1.default);
    constructor() { }
    signUp = async (req, res, next) => {
        let { userName, email, password, cPassword, age, address, phone, gender } = req.body;
        if (await this._userModel.findOne({ email })) {
            throw new classError_1.AppError("Email already exists!!!!", 409);
        }
        const hash = await (0, hash_1.Hash)(password);
        const otp = await (0, sendEmail_1.generateOTP)();
        const hashedOtp = await (0, hash_1.Hash)(String(otp));
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
        event_1.eventEmmiter.emit("confirmEmail", { email, otp });
        return res.status(201).json({ message: "User created successfully 👍", user });
    };
    confirmEmail = async (req, res, next) => {
        const { email, otp } = req.body;
        const user = await this._userModel.findOne({ email, confirmed: { $exists: false } });
        if (!user) {
            throw new classError_1.AppError("Email Not Found or already confirmed!!!!", 404);
        }
        if (!await (0, hash_1.Compare)(otp, user?.otp)) {
            throw new classError_1.AppError("Invalid OTP!!!!", 400);
        }
        await this._userModel.updateOne({ email: user?.email }, { confirmed: true, $unset: { otp: "" } });
        return res.status(200).json({ message: "Email confirmed successfully👌" });
    };
    signIn = async (req, res, next) => {
        const { email, password } = req.body;
        const user = await this._userModel.findOne({
            email,
            confirmed: { $exists: true },
            provider: user_model_1.ProviderType.system,
        });
        if (!user) {
            throw new classError_1.AppError("Email Not Found or Not confirmed or invalid provider!!!!", 404);
        }
        if (!(await (0, hash_1.Compare)(password, user?.password))) {
            throw new classError_1.AppError("Invalid Password!!", 404);
        }
        if (user.is2FAEnabled) {
            const otp = await (0, sendEmail_1.generateOTP)();
            const hashedOtp = await (0, hash_1.Hash)(String(otp));
            user.tempOtp = hashedOtp;
            user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
            await user.save();
            event_1.eventEmmiter.emit("send2FA", { email: user.email, otp });
            return res.status(200).json({
                message: "2FA code sent to your email. Please verify to complete login.",
            });
        }
        const jwtid = (0, uuid_1.v4)();
        const access_token = await (0, token_1.GenerateToken)({
            payload: { id: user._id, email },
            signature: user.role == user_model_1.RoleType.user
                ? process.env.ACCESS_TOKEN_USER
                : process.env.ACCESS_TOKEN_ADMIN,
            options: { expiresIn: "1h", jwtid },
        });
        const refresh_token = await (0, token_1.GenerateToken)({
            payload: { id: user._id, email },
            signature: user.role == user_model_1.RoleType.user
                ? process.env.REFRESH_TOKEN_USER
                : process.env.REFRESH_TOKEN_ADMIN,
            options: { expiresIn: "1y", jwtid },
        });
        return res
            .status(200)
            .json({ message: "User logged in successfully", access_token, refresh_token });
    };
    getProfile = async (req, res, next) => {
        const user = await this._userModel.findOne({ _id: req?.user?._id }, undefined, {
            populate: [{
                    path: 'friends'
                }]
        });
        const groups = await this._chatModel.find({
            filter: {
                participants: { $in: [req?.user?._id] },
                group: { $exists: true }
            }
        });
        return res.status(200).json({ message: "Success", user, groups });
    };
    logOut = async (req, res, next) => {
        try {
            const { flag } = req.body;
            if (flag === user_validation_1.FlagType.all) {
                await this._userModel.updateOne({ _id: req.user?._id }, { changeCredentials: new Date() });
                return res
                    .status(200)
                    .json({ message: "Success, logged out from all devices" });
            }
            const payload = req.decoded?.decoded ?? req.decoded;
            const jti = payload?.jti;
            const exp = payload?.exp;
            const userId = req.user?._id;
            if (!jti || !exp || !userId) {
                throw new classError_1.AppError("Missing tokenId, exp, or userId", 400);
            }
            await this._revokeToken.create({
                tokenId: jti,
                userId,
                expireAt: new Date(exp * 1000),
            });
            return res
                .status(200)
                .json({ message: "Success, logged out from this device" });
        }
        catch (err) {
            next(err);
        }
    };
    refreshToken = async (req, res, next) => {
        try {
            const user = req.user;
            if (!user)
                throw new classError_1.AppError("User not found in request", 401);
            const payload = req.decoded?.decoded ?? req.decoded;
            const oldJti = payload?.jti;
            const oldExp = payload?.exp;
            if (!oldJti || !oldExp) {
                throw new classError_1.AppError("Missing jti/exp in current refresh token", 400);
            }
            await this._revokeToken.create({
                tokenId: oldJti,
                userId: user._id,
                expireAt: new Date(oldExp * 1000),
            });
            const newJti = (0, uuid_1.v4)();
            const access_token = await (0, token_1.GenerateToken)({
                payload: { id: user._id, email: user.email },
                signature: user.role === user_model_1.RoleType.user
                    ? process.env.ACCESS_TOKEN_USER
                    : process.env.ACCESS_TOKEN_ADMIN,
                options: { expiresIn: "1h", jwtid: newJti },
            });
            const refresh_token = await (0, token_1.GenerateToken)({
                payload: { id: user._id, email: user.email },
                signature: user.role === user_model_1.RoleType.user
                    ? process.env.REFRESH_TOKEN_USER
                    : process.env.REFRESH_TOKEN_ADMIN,
                options: { expiresIn: "1y", jwtid: newJti },
            });
            return res
                .status(200)
                .json({ message: "Success", access_token, refresh_token });
        }
        catch (err) {
            next(err);
        }
    };
    loginWithGmail = async (req, res, next) => {
        const { idToken } = req.body;
        const client = new google_auth_library_1.OAuth2Client();
        async function verify() {
            const ticket = await client.verifyIdToken({
                idToken,
                audience: process.env.WEB_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            return payload;
        }
        const { email, email_verified, name, picture } = await verify();
        let user = await this._userModel.findOne({ email });
        if (!user) {
            user = await this._userModel.create({
                userName: name,
                email: email,
                confirmed: email_verified,
                profileImage: picture,
                password: (0, uuid_1.v4)(),
                provider: user_model_1.ProviderType.google
            });
        }
        if (user?.provider === user_model_1.ProviderType.system) {
            throw new classError_1.AppError("please log in on system", 404);
        }
        const newJti = (0, uuid_1.v4)();
        const access_token = await (0, token_1.GenerateToken)({
            payload: { id: user._id, email: user.email },
            signature: user.role === user_model_1.RoleType.user
                ? process.env.ACCESS_TOKEN_USER
                : process.env.ACCESS_TOKEN_ADMIN,
            options: { expiresIn: "1h", jwtid: newJti },
        });
        const refresh_token = await (0, token_1.GenerateToken)({
            payload: { id: user._id, email: user.email },
            signature: user.role === user_model_1.RoleType.user
                ? process.env.REFRESH_TOKEN_USER
                : process.env.REFRESH_TOKEN_ADMIN,
            options: { expiresIn: "1y", jwtid: newJti },
        });
        return res.status(200).json({ message: "success", access_token, refresh_token });
    };
    forgetPassword = async (req, res, next) => {
        const { email } = req.body;
        const user = await this._userModel.findOne({ email, confirmed: { $exists: true } });
        if (!user) {
            throw new classError_1.AppError("Email Not Found or Not confirmed!!!!", 404);
        }
        const otp = await (0, sendEmail_1.generateOTP)();
        const hashedOtp = await (0, hash_1.Hash)(String(otp));
        event_1.eventEmmiter.emit("forgetPassword", { email, otp });
        await this._userModel.updateOne({ email: user?.email }, { otp: hashedOtp });
        return res.status(200).json({ message: "Success to Send OTP", });
    };
    resetPassword = async (req, res, next) => {
        const { email, otp, password, cPassword } = req.body;
        const user = await this._userModel.findOne({ email, otp: { $exists: true } });
        if (!user) {
            throw new classError_1.AppError("User Not Found !!!!", 404);
        }
        if (!await (0, hash_1.Compare)(otp, user?.otp)) {
            throw new classError_1.AppError("Invalid OTP", 400);
        }
        const hash = await (0, hash_1.Hash)(password);
        await this._userModel.updateOne({ email: user?.email }, { password: hash, $unset: { otp: "" } });
        return res.status(200).json({ message: "Success" });
    };
    uploadImage = async (req, res, next) => {
        const { ContentType, originalname } = req.body;
        const { url, Key } = await (0, s3_config_1.createUploadFilePresignedUrl)({
            originalname,
            ContentType,
            path: `users/${req.user?._id}`
        });
        const user = await this._userModel.findOneAndUpdate({
            _id: req.user?._id
        }, {
            profileImage: Key,
            tempProfileImage: req.user?.profileImage
        });
        if (!user) {
            throw new classError_1.AppError("User Not Found !!!!", 404);
        }
        event_1.eventEmmiter.emit("UploadProfileImage", { userId: req.user?._id, oldKey: req.user?.profileImage, Key, expiresIn: 60 });
        return res.status(200).json({ message: "Success", url, user });
    };
    freezeAccount = async (req, res, next) => {
        const { userId } = req.params;
        if (userId && req.user?.role !== user_model_1.RoleType.admin) {
            throw new classError_1.AppError("Unauthorized", 401);
        }
        const user = await this._userModel.findOneAndUpdate({ _id: userId || req.user?._id, deletedAt: { $exists: false } }, { deletedAt: new Date(), deletedBy: req.user?._id, changeCredentials: new Date() });
        if (!user) {
            throw new classError_1.AppError("User Not Found !!!!", 404);
        }
        return res.status(200).json({ message: "Freezed" });
    };
    unfreezeAccount = async (req, res, next) => {
        const { userId } = req.params;
        if (req.user?.role !== user_model_1.RoleType.admin) {
            throw new classError_1.AppError("Unauthorized", 401);
        }
        const user = await this._userModel.findOneAndUpdate({ _id: userId, deletedAt: { $exists: true }, deletedBy: { $ne: userId } }, {
            $unset: { deletedAt: "", deletedBy: "" },
            restoredBy: req.user?._id,
            restoredAt: new Date()
        });
        if (!user) {
            throw new classError_1.AppError("User Not Found !!!!", 404);
        }
        return res.status(200).json({ message: "unFreezed" });
    };
    updatePassword = async (req, res, next) => {
        try {
            const { oldPassword, newPassword } = req.body;
            if (!req.user) {
                throw new classError_1.AppError("Unauthorized", 401);
            }
            const isMatch = await (0, hash_1.Compare)(oldPassword, req.user.password);
            if (!isMatch) {
                throw new classError_1.AppError("Invalid Old Password", 400);
            }
            const hash = await (0, hash_1.Hash)(newPassword);
            await this._userModel.updateOne({ _id: req.user._id }, { password: hash, changeCredentials: new Date() });
            return res.status(200).json({ message: "Password updated successfully 👍" });
        }
        catch (err) {
            next(err);
        }
    };
    updateProfile = async (req, res, next) => {
        try {
            const { userName, phone, gender, age } = req.body;
            if (!req.user) {
                throw new classError_1.AppError("Unauthorized", 401);
            }
            if (userName)
                req.user.userName = userName;
            if (gender)
                req.user.gender = gender;
            if (age)
                req.user.age = age;
            if (phone)
                req.user.phone = phone;
            await req.user.save();
            return res.status(200).json({
                message: "Profile updated successfully 👍",
                user: req.user,
            });
        }
        catch (err) {
            next(err);
        }
    };
    updateEmail = async (req, res, next) => {
        try {
            const { email } = req.body;
            if (!email) {
                throw new classError_1.AppError("Email is required!", 400);
            }
            const exists = await this._userModel.findOne({ email });
            if (exists) {
                throw new classError_1.AppError("Email Already Exists!", 400);
            }
            const otp = await (0, sendEmail_1.generateOTP)();
            const hashedOtp = await (0, hash_1.Hash)(String(otp));
            event_1.eventEmmiter.emit("confirmEmail", { email, otp });
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
        }
        catch (err) {
            next(err);
        }
    };
    enable2FA = async (req, res) => {
        if (!req.user)
            return res.status(401).json({ message: "Unauthorized" });
        const otp = (0, sendEmail_1.generateOTP)();
        const hashedOtp = await (0, hash_1.Hash)(String(otp));
        req.user.tempOtp = hashedOtp;
        req.user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
        await req.user.save();
        event_1.eventEmmiter.emit("sendEmail", { email: req.user.email, otp });
        return res.status(200).json({ message: "OTP sent to your email" });
    };
    confirm2FA = async (req, res) => {
        const { otp } = req.body;
        if (!req.user)
            return res.status(401).json({ message: "Unauthorized" });
        const isValid = await (0, hash_1.Compare)(otp, req.user.tempOtp);
        if (!isValid || req.user.otpExpiry < new Date()) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }
        req.user.is2FAEnabled = true;
        req.user.tempOtp = undefined;
        req.user.otpExpiry = undefined;
        await req.user.save();
        return res.status(200).json({ message: "2FA enabled successfully ✅" });
    };
    dashBoard = async (req, res, next) => {
        const result = await Promise.allSettled([
            this._userModel.find({ filter: {} }),
            this._postModel.find({ filter: {} })
        ]);
        return res.status(200).json({ message: "success", result });
    };
    updateRole = async (req, res, next) => {
        const { userId } = req.params;
        const { role: newRole } = req.body;
        const denyRoles = [newRole, user_model_1.RoleType.superAdmin];
        if (req?.user?.role == user_model_1.RoleType.admin) {
            denyRoles.push(user_model_1.RoleType.admin);
            if (newRole == user_model_1.RoleType.superAdmin) {
                throw new classError_1.AppError("an admin can't update a role to be superAdmin", 404);
            }
        }
        const user = await this._userModel.findOneAndUpdate({ _id: userId, role: { $nin: denyRoles } }, { role: newRole }, { new: true });
        if (!user) {
            throw new classError_1.AppError("User Not Found !!!!", 404);
        }
        return res.status(200).json({ message: "success", user });
    };
    sendRequest = async (req, res, next) => {
        const { userId } = req.params;
        const user = await this._userModel.findOne({ _id: userId });
        if (!user) {
            throw new classError_1.AppError("User Not Found !!!!", 404);
        }
        if (req?.user?._id == userId) {
            throw new classError_1.AppError("U can't send friend request to yourself", 404);
        }
        const checkRequest = await this._friendRequestModel.findOne({
            createdBy: { $in: [req?.user?._id, userId] },
            sendTo: { $in: [req?.user?._id, userId] }
        });
        if (checkRequest) {
            throw new classError_1.AppError("Request already exists!!", 400);
        }
        const friendRequest = await this._friendRequestModel.create({
            createdBy: req?.user?._id,
            sendTo: userId
        });
        return res.status(200).json({ message: "success", friendRequest });
    };
    acceptRequest = async (req, res, next) => {
        const { requestId } = req.params;
        const checkRequest = await this._friendRequestModel.findOneAndUpdate({
            _id: requestId,
            sendTo: req?.user?._id,
            acceptedAt: { $exists: false }
        }, {
            acceptedAt: new Date()
        });
        if (!checkRequest) {
            throw new classError_1.AppError("Request not found", 400);
        }
        await Promise.all([
            this._userModel.updateOne({ _id: checkRequest.createdBy }, { $push: { friends: checkRequest.sendTo } }),
            this._userModel.updateOne({ _id: checkRequest.sendTo }, { $push: { friends: checkRequest.createdBy } })
        ]);
        return res.status(200).json({ message: "success" });
    };
    deleteFriendRequest = async (req, res, next) => {
        try {
            const { requestId } = req.params;
            const friendRequest = await this._friendRequestModel.findOne({ _id: requestId });
            if (!friendRequest) {
                throw new classError_1.AppError("Friend request not found!", 404);
            }
            const isAuthorized = friendRequest.createdBy.toString() === req.user?._id.toString() ||
                friendRequest.sendTo.toString() === req.user?._id.toString();
            if (!isAuthorized) {
                throw new classError_1.AppError("Unauthorized to delete this request!", 403);
            }
            const result = await this._friendRequestModel.deleteOne({ _id: requestId });
            if (result.deletedCount === 0) {
                throw new classError_1.AppError("Failed to delete friend request!", 500);
            }
            return res.status(200).json({ message: "Friend request deleted successfully ✅" });
        }
        catch (error) {
            next(error);
        }
    };
    blockUser = async (req, res, next) => {
        try {
            const { userId } = req.params;
            if (req?.user?._id.toString() === userId) {
                throw new classError_1.AppError("You can't block yourself!", 400);
            }
            const targetUser = await this._userModel.findOne({ _id: userId });
            if (!targetUser) {
                throw new classError_1.AppError("User not found!", 404);
            }
            const currentUser = await this._userModel.findOne({
                _id: req.user?._id,
                blockedUsers: userId,
            });
            if (currentUser) {
                throw new classError_1.AppError("User already blocked!", 400);
            }
            await this._userModel.updateOne({ _id: req.user?._id }, { $addToSet: { blockedUsers: userId } });
            await this._friendRequestModel.deleteMany({
                $or: [
                    { createdBy: req.user?._id, sendTo: userId },
                    { createdBy: userId, sendTo: req.user?._id },
                ],
            });
            await this._userModel.updateOne({ _id: req.user?._id }, { $pull: { friends: userId } });
            await this._userModel.updateOne({ _id: userId }, { $pull: { friends: req.user?._id } });
            return res.status(200).json({ message: "User blocked successfully ✅" });
        }
        catch (error) {
            next(error);
        }
    };
    unblockUser = async (req, res, next) => {
        try {
            const { userId } = req.params;
            if (req?.user?._id.toString() === userId) {
                throw new classError_1.AppError("You can't unblock yourself!", 400);
            }
            const result = await this._userModel.updateOne({ _id: req.user?._id }, { $pull: { blockedUsers: userId } });
            if (result.modifiedCount === 0) {
                throw new classError_1.AppError("User not found in blocked list!", 404);
            }
            return res.status(200).json({ message: "User unblocked successfully ✅" });
        }
        catch (error) {
            next(error);
        }
    };
    unFriend = async (req, res, next) => {
        try {
            const { userId } = req.params;
            if (req?.user?._id.toString() === userId?.toString()) {
                throw new classError_1.AppError("You cannot unfriend yourself", 400);
            }
            const [currentUser, targetUser] = await Promise.all([
                this._userModel.findOne({ _id: req?.user?._id }),
                this._userModel.findOne({ _id: userId }),
            ]);
            if (!currentUser)
                throw new classError_1.AppError("Your account not found", 404);
            if (!targetUser)
                throw new classError_1.AppError("User not found", 404);
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
            const currentFriendIds = currentFriends.map((f) => f?._id?.toString?.() || f?.toString?.());
            const targetFriendIds = targetFriends.map((f) => f?._id?.toString?.() || f?.toString?.());
            const areFriends = currentFriendIds.includes(userId?.toString()) ||
                targetFriendIds.includes(req?.user?._id.toString());
            if (!areFriends) {
                throw new classError_1.AppError("You are not friends with this user", 400);
            }
            await Promise.all([
                this._userModel.updateOne({ _id: req?.user?._id }, { $pull: { friends: userId } }),
                this._userModel.updateOne({ _id: userId }, { $pull: { friends: req?.user?._id } }),
            ]);
            return res.status(200).json({ message: "Friend removed successfully ❌" });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.default = new UserService();
