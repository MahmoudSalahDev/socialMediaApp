import { Server } from "socket.io"
import { AppError } from "../../utils/classError"
import { decodedTokenAndFetchUser, GetSignature, TokenType } from "../../utils/token"
import { Server as HttpServer } from 'http'
import { SocketWithUser } from "./gateway.interface"
import { ChatGateway } from "../chat/chat.gateway"

export const connectionSockets = new Map<string, string[]>()
let io: Server | undefined = undefined


export const initializationIo = (httpServer: HttpServer) => {

    io = new Server(httpServer, {
        cors: {
            origin: "*"
        }
    });

    io.use(async (socket: SocketWithUser, next) => {
        try {
            const { authorization } = socket.handshake.auth;
            const [prefix, token] = authorization?.split(" ") || [];
            if (!prefix || !token) {
                return next(new AppError("Token not exist!", 404));
            }

            const signature = await GetSignature(TokenType.access, prefix);
            if (!signature) {
                return next(new AppError("InValid signature", 400));
            }

            const { user, decoded } = await decodedTokenAndFetchUser(token, signature);

            // add socket id to user
            const userId = user._id.toString();
            const socketIds = connectionSockets.get(userId) || [];
            socketIds.push(socket.id);
            connectionSockets.set(userId, socketIds);

            socket.user = user;
            socket.decoded = decoded;

            next();
        } catch (error: any) {
            next(error);
        }
    });

    const chatGateway: ChatGateway = new ChatGateway();

    io.on("connection", (socket: SocketWithUser) => {
        console.log("User connected:", socket.user?._id);
        chatGateway.register(socket, getIo());

        const userId = socket?.user?._id?.toString()!;

       // ✅ user starts typing
socket.on("typing", (data) => {
    const { roomId } = data;
    const userId = socket.user?._id?.toString();
    const username = socket.user?._id ||  "Unknown User";

    // emit to others in the same room
    socket.to(roomId).emit("friend_typing", { userId, username });

    // ✅ log in the backend console
    console.log(`✏️  User: ${username} (${userId}) is typing in room ${roomId}`);
});

// ✅ user stops typing
socket.on("stop_typing", (data) => {
    const { roomId } = data;
    const userId = socket.user?._id?.toString();
    const username = socket.user?._id ||  "Unknown User";

    // emit to others in the same room
    socket.to(roomId).emit("friend_stop_typing", { userId, username });

    // ✅ log in the backend console
    console.log(`🛑 User: ${username} (${userId}) stopped typing in room ${roomId}`);
});


        const userTabs = connectionSockets.get(userId);
        if (userTabs && userTabs.length === 1) {
            getIo().emit("online_user", { userId });
            console.log(`🟢 User ${userId} is now online`);
        }

        socket.on("disconnect", () => {
            let remainingTabs = connectionSockets.get(userId) || [];
            remainingTabs = remainingTabs.filter(tab => tab !== socket.id);

            if (remainingTabs.length) {
                connectionSockets.set(userId, remainingTabs);
            } else {
                connectionSockets.delete(userId);
                // emit offline only when all tabs closed
                getIo().emit("offline_user", { userId });
                console.log(`🔴 User ${userId} is now offline`);
            }
        });
    });
};



const getIo = () => {
    if (!io) {
        throw new AppError("Io not inialized!!", 400)
    }
    return io
}