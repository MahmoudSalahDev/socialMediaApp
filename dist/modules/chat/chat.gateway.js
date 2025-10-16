"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const chat_events_1 = require("./chat.events");
class ChatGateway {
    _chatEvents = new chat_events_1.ChatEvents();
    constructor() {
    }
    register = (socket, io) => {
        this._chatEvents.sayHi(socket, io);
        this._chatEvents.sendMessage(socket, io);
        this._chatEvents.join_room(socket, io);
        this._chatEvents.sendGroupMessage(socket, io);
    };
}
exports.ChatGateway = ChatGateway;
