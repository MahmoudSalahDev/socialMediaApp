"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializationIo = exports.connectionSockets = void 0;
const socket_io_1 = require("socket.io");
const classError_1 = require("../../utils/classError");
const token_1 = require("../../utils/token");
const chat_gateway_1 = require("../chat/chat.gateway");
exports.connectionSockets = new Map();
let io = undefined;
const initializationIo = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: "*"
        }
    });
    io.use(async (socket, next) => {
        try {
            const { authorization } = socket.handshake.auth;
            const [prefix, token] = authorization?.split(" ") || [];
            if (!prefix || !token) {
                return next(new classError_1.AppError("Token not exist!", 404));
            }
            const signature = await (0, token_1.GetSignature)(token_1.TokenType.access, prefix);
            if (!signature) {
                return next(new classError_1.AppError("InValid signature", 400));
            }
            const { user, decoded } = await (0, token_1.decodedTokenAndFetchUser)(token, signature);
            const userId = user._id.toString();
            const socketIds = exports.connectionSockets.get(userId) || [];
            socketIds.push(socket.id);
            exports.connectionSockets.set(userId, socketIds);
            socket.user = user;
            socket.decoded = decoded;
            next();
        }
        catch (error) {
            next(error);
        }
    });
    const chatGateway = new chat_gateway_1.ChatGateway();
    io.on("connection", (socket) => {
        console.log("User connected:", socket.user?._id);
        chatGateway.register(socket, getIo());
        const userId = socket?.user?._id?.toString();
        socket.on("typing", (data) => {
            const { roomId } = data;
            const userId = socket.user?._id?.toString();
            const username = socket.user?._id || "Unknown User";
            socket.to(roomId).emit("friend_typing", { userId, username });
            console.log(`✏️  User: ${username} (${userId}) is typing in room ${roomId}`);
        });
        socket.on("stop_typing", (data) => {
            const { roomId } = data;
            const userId = socket.user?._id?.toString();
            const username = socket.user?._id || "Unknown User";
            socket.to(roomId).emit("friend_stop_typing", { userId, username });
            console.log(`🛑 User: ${username} (${userId}) stopped typing in room ${roomId}`);
        });
        const userTabs = exports.connectionSockets.get(userId);
        if (userTabs && userTabs.length === 1) {
            getIo().emit("online_user", { userId });
            console.log(`🟢 User ${userId} is now online`);
        }
        socket.on("disconnect", () => {
            let remainingTabs = exports.connectionSockets.get(userId) || [];
            remainingTabs = remainingTabs.filter(tab => tab !== socket.id);
            if (remainingTabs.length) {
                exports.connectionSockets.set(userId, remainingTabs);
            }
            else {
                exports.connectionSockets.delete(userId);
                getIo().emit("offline_user", { userId });
                console.log(`🔴 User ${userId} is now offline`);
            }
        });
    });
};
exports.initializationIo = initializationIo;
const getIo = () => {
    if (!io) {
        throw new classError_1.AppError("Io not inialized!!", 400);
    }
    return io;
};
