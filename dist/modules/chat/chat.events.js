"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatEvents = void 0;
const chat_service_1 = require("./chat.service");
class ChatEvents {
    _chatService = new chat_service_1.ChatService();
    constructor() {
    }
    sayHi = (socket, io) => {
        return socket.on("sayHi", (data) => {
            this._chatService.sayHi(data, socket, io);
        });
    };
    sendMessage = (socket, io) => {
        return socket.on("sendMessage", (data) => {
            this._chatService.sendMessage(data, socket, io);
        });
    };
    join_room = (socket, io) => {
        return socket.on("join_room", (data) => {
            this._chatService.join_room(data, socket, io);
        });
    };
    sendGroupMessage = (socket, io) => {
        return socket.on("sendGroupMessage", (data) => {
            this._chatService.sendGroupMessage(data, socket, io);
        });
    };
}
exports.ChatEvents = ChatEvents;
