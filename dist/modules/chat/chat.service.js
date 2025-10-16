"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const chat_repository_1 = require("../../DB/repositories/chat.repository");
const chat_model_1 = __importDefault(require("../../DB/model/chat.model"));
const classError_1 = require("../../utils/classError");
const user_repository_1 = require("../../DB/repositories/user.repository");
const user_model_1 = __importDefault(require("../../DB/model/user.model"));
const gateway_1 = require("../geteway/gateway");
const mongoose_1 = require("mongoose");
const s3_config_1 = require("../../utils/s3.config");
const uuid_1 = require("uuid");
class ChatService {
    _chatModel = new chat_repository_1.ChatRepository(chat_model_1.default);
    _userModel = new user_repository_1.UserRepository(user_model_1.default);
    constructor() { }
    getChat = async (req, res, nex) => {
        const { userId } = req?.params;
        let { page, limit = 5 } = req?.query;
        if (page < 0 || !page)
            page = 1;
        page = page * 1 || 1;
        limit = limit * 1 || 5;
        const chat = await this._chatModel.findOne({
            participants: { $all: [userId, req.user?._id] },
            group: { $exists: false }
        }, {
            messages: {
                $slice: [-(page * limit), limit]
            }
        }, {
            populate: [{
                    path: "participants",
                }]
        });
        if (!chat) {
            throw new classError_1.AppError("Chat not found", 404);
        }
        return res.status(200).json({ message: "success", chat });
    };
    getGroupChat = async (req, res, nex) => {
        const { groupId } = req?.params;
        let { page, limit = 5 } = req?.query;
        if (page < 0 || !page)
            page = 1;
        page = page * 1 || 1;
        limit = limit * 1 || 5;
        const chat = await this._chatModel.findOne({
            _id: groupId,
            participants: { $in: [req.user?._id] },
            group: { $exists: true }
        }, undefined, {
            populate: [{
                    path: "messages.createdBy",
                }]
        });
        if (!chat) {
            throw new classError_1.AppError("Chat not found", 400);
        }
        return res.status(200).json({ message: "success", chat });
    };
    createGroupChat = async (req, res, nex) => {
        let { group, groupImage, participants } = req?.body;
        const createdBy = req?.user?._id;
        const dbParticipants = participants.map((participant) => mongoose_1.Types.ObjectId.createFromHexString(participant));
        const users = await this._userModel.find({
            filter: {
                _id: {
                    $in: dbParticipants
                },
                friends: {
                    $in: createdBy
                }
            }
        });
        console.log({ users });
        console.log({ participants });
        if (users.length !== participants.length) {
            throw new classError_1.AppError("some users not found", 404);
        }
        const roomId = group?.replaceAll(/\s+/g, "-") + "_" + (0, uuid_1.v4)();
        if (req?.file) {
            groupImage = await (0, s3_config_1.uploadFile)({
                path: `chat/${roomId}`,
                file: req?.file
            });
        }
        dbParticipants.push(createdBy);
        const chat = await this._chatModel.create({
            group,
            groupImage,
            participants: dbParticipants,
            roomId,
            createdBy,
            messages: []
        });
        if (!chat) {
            if (groupImage) {
                await (0, s3_config_1.deleteFile)({ Key: groupImage });
            }
            throw new classError_1.AppError("could't create chat!!", 404);
        }
        return res.status(200).json({ message: "success", chat });
    };
    sayHi = (data, socket, io) => {
        console.log(data);
    };
    join_room = async (data, socket, io) => {
        console.log(data);
        const { roomId } = data;
        const chat = await this._chatModel.findOne({
            roomId,
            participants: {
                $in: [socket.user?._id]
            },
            group: { $exists: true }
        });
        if (!chat) {
            throw new classError_1.AppError("chat not found!!", 400);
        }
        socket.join(chat?.roomId);
    };
    sendMessage = async (data, socket, io) => {
        console.log(data);
        const { content, sendTo } = data;
        const createdBy = socket.user?._id;
        if (!createdBy) {
            throw new classError_1.AppError("User not authenticated", 401);
        }
        const user = await this._userModel.findOne({
            _id: sendTo,
            friends: { $in: [createdBy] }
        });
        if (!user) {
            throw new classError_1.AppError("User not found", 404);
        }
        const chat = await this._chatModel.findOneAndUpdate({
            participants: { $all: [createdBy, sendTo] },
            group: { $exists: false }
        }, {
            $push: {
                messages: {
                    content,
                    createdBy
                }
            }
        });
        if (!chat) {
            const newChat = await this._chatModel.create({
                participants: [createdBy, sendTo],
                createdBy,
                messages: [{
                        content,
                        createdBy
                    }]
            });
            if (!newChat) {
                throw new classError_1.AppError("failed to create chat", 400);
            }
        }
        io.to(gateway_1.connectionSockets.get(createdBy.toString())).emit("successMessage", { content });
        io.to(gateway_1.connectionSockets.get(sendTo.toString())).emit("newMessage", { content, from: socket.user });
    };
    sendGroupMessage = async (data, socket, io) => {
        const { content, groupId } = data;
        const createdBy = socket.user?._id;
        if (!createdBy) {
            throw new classError_1.AppError("User not authenticated", 401);
        }
        const chat = await this._chatModel.findOneAndUpdate({
            _id: groupId,
            participants: { $in: [createdBy] },
            group: { $exists: true }
        }, {
            $push: {
                messages: {
                    content,
                    createdBy
                }
            }
        });
        if (!chat) {
            throw new classError_1.AppError("chat not found", 404);
        }
        io.to(gateway_1.connectionSockets.get(createdBy.toString())).emit("successMessage", { content });
        io.to(chat?.roomId).emit("newMessage", { content, from: socket.user, groupId });
    };
}
exports.ChatService = ChatService;
