import { Server } from "socket.io";
import { SocketWithUser } from "../geteway/gateway.interface";
import { ChatEvents } from "./chat.events";


export class ChatGateway {
    private _chatEvents:ChatEvents = new ChatEvents()
    constructor() {
    }

    register = (socket:SocketWithUser , io:Server) => {
        this._chatEvents.sayHi(socket , io)
        this._chatEvents.sendMessage(socket , io)
        this._chatEvents.join_room(socket , io)
        this._chatEvents.sendGroupMessage(socket , io)
    }
}