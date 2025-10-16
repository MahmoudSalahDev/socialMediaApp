import { Server } from "socket.io";
import { SocketWithUser } from "../geteway/gateway.interface";
import { ChatService } from "./chat.service";

export class ChatEvents {

    private _chatService:ChatService = new ChatService()

    constructor() {

    }

    sayHi = (socket: SocketWithUser , io:Server) => {
        return socket.on("sayHi", (data) => {
            this._chatService.sayHi(data , socket , io)

        })
    }
     sendMessage = (socket: SocketWithUser , io:Server) => {
        return socket.on("sendMessage", (data) => {
            this._chatService.sendMessage(data , socket , io)

        })
    }
    join_room = (socket: SocketWithUser , io:Server) => {
        return socket.on("join_room", (data) => {
            this._chatService.join_room(data , socket , io)

        })
    }
    sendGroupMessage = (socket: SocketWithUser , io:Server) => {
        return socket.on("sendGroupMessage", (data) => {
            this._chatService.sendGroupMessage(data , socket , io)

        })
    }


}