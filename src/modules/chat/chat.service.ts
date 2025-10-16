import { Server } from "socket.io";
import { SocketWithUser } from "../geteway/gateway.interface";
import { NextFunction, Request, Response } from "express";
import { ChatRepository } from "../../DB/repositories/chat.repository";
import ChatModel from "../../DB/model/chat.model";
import { AppError } from "../../utils/classError";
import { UserRepository } from "../../DB/repositories/user.repository";
import userModel from "../../DB/model/user.model";
import { connectionSockets } from "../geteway/gateway";
import { Types } from "mongoose";
import { deleteFile, uploadFile } from "../../utils/s3.config";
import { v4 as uuidv4 } from "uuid";


export class ChatService {


    private _chatModel = new ChatRepository(ChatModel)
    private _userModel = new UserRepository(userModel)


    constructor() { }

    //=================rest API===========


    getChat = async (req: Request, res: Response, nex: NextFunction) => {

        const { userId } = req?.params
        let { page, limit = 5 } = req?.query as unknown as { page: number, limit: number }
        if (page < 0 || !page) page = 1
        page = page * 1 || 1
        limit = limit * 1 || 5


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
        })

        if (!chat) {
            throw new AppError("Chat not found", 404)
        }



        return res.status(200).json({ message: "success", chat })
    }

    getGroupChat = async (req: Request, res: Response, nex: NextFunction) => {

        const { groupId } = req?.params
        let { page, limit = 5 } = req?.query as unknown as { page: number, limit: number }
        if (page < 0 || !page) page = 1
        page = page * 1 || 1
        limit = limit * 1 || 5


        const chat = await this._chatModel.findOne({
            _id:groupId,
            participants: { $in: [ req.user?._id] },
            group: { $exists: true }
        },
        //  {
        //     messages: {
        //         $slice: [-(page * limit), limit]
        //     }
        // },
        undefined,
         {
            populate: [{
                path: "messages.createdBy",
            }]
        })

        if (!chat) {
            throw new AppError("Chat not found", 400)
        }



        return res.status(200).json({ message: "success", chat })
    }


    createGroupChat = async (req: Request, res: Response, nex: NextFunction) => {

        let { group, groupImage, participants } = req?.body
        const createdBy = req?.user?._id as Types.ObjectId

        const dbParticipants = participants.map((participant: string) => Types.ObjectId.createFromHexString(participant))

        const users = await this._userModel.find({
            filter: {
                _id: {
                    $in: dbParticipants
                },
                friends: {
                    $in: createdBy
                }
            }
        })
        console.log({ users });
        console.log({ participants });


        if (users.length !== participants.length) {
            throw new AppError("some users not found", 404)

        }
        const roomId = group?.replaceAll(/\s+/g, "-") + "_" + uuidv4()
        if (req?.file) {
            groupImage = await uploadFile({
                path: `chat/${roomId}`,
                file: req?.file as Express.Multer.File
            })
        }

        dbParticipants.push(createdBy)
        const chat = await this._chatModel.create({
            group,
            groupImage,
            participants: dbParticipants,
            roomId,
            createdBy,
            messages: []
        })




        if (!chat) {
            if (groupImage) {
                await deleteFile({ Key: groupImage })
            }
            throw new AppError("could't create chat!!", 404)
        }



        return res.status(200).json({ message: "success", chat })
    }




    //=================socket io===========

    sayHi = (data: any, socket: SocketWithUser, io: Server) => {
        console.log(data);

    }

    join_room = async (data: any, socket: SocketWithUser, io: Server) => {
        console.log(data);
        const { roomId } = data

        const chat = await this._chatModel.findOne({
            roomId,
            participants: {
                $in: [socket.user?._id]
            },
            group: { $exists: true }
        })

        if (!chat) {
            throw new AppError("chat not found!!", 400);
        }
        socket.join(chat?.roomId!)
        // console.log({Joined:chat?.roomId!});
        

    }

    sendMessage = async (data: any, socket: SocketWithUser, io: Server) => {
        console.log(data);
        const { content, sendTo } = data

        const createdBy = socket.user?._id
        if (!createdBy) {
            throw new AppError("User not authenticated", 401);
        }

        const user = await this._userModel.findOne({
            _id: sendTo,
            friends: { $in: [createdBy] }
        })

        if (!user) {
            throw new AppError("User not found", 404)
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
        })

        if (!chat) {

            const newChat = await this._chatModel.create({
                participants: [createdBy, sendTo],
                createdBy,
                messages: [{
                    content,
                    createdBy
                }]
            })
            if (!newChat) {
                throw new AppError("failed to create chat", 400)
            }
        }

        io.to(connectionSockets.get(createdBy.toString())!).emit("successMessage", { content })
        io.to(connectionSockets.get(sendTo.toString())!).emit("newMessage", { content, from: socket.user })

    }


    sendGroupMessage = async (data: any, socket: SocketWithUser, io: Server) => {
        // console.log(data);
        const { content, groupId } = data

        const createdBy = socket.user?._id
        if (!createdBy) {
            throw new AppError("User not authenticated", 401);
        }

        

        const chat = await this._chatModel.findOneAndUpdate({
            _id:groupId,
            participants: { $in: [createdBy] },
            group: { $exists: true }
        }, {
            $push: {
                messages: {
                    content,
                    createdBy
                }
            }
        })

        if (!chat) {

          
                throw new AppError("chat not found", 404)
            
        }

        io.to(connectionSockets.get(createdBy.toString())!).emit("successMessage", { content })
        io.to(chat?.roomId!).emit("newMessage", { content, from: socket.user , groupId })

    }

}