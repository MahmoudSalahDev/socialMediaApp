"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: (0, path_1.resolve)("./config/.env") });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = require("express-rate-limit");
const classError_1 = require("./utils/classError");
const user_controller_1 = __importDefault(require("./modules/users/user.controller"));
const connectionDB_1 = require("./DB/connectionDB");
const node_stream_1 = require("node:stream");
const node_util_1 = require("node:util");
const post_controller_1 = __importDefault(require("./modules/posts/post.controller"));
const socket_io_1 = require("socket.io");
const token_1 = require("./utils/token");
const writePipeLine = (0, node_util_1.promisify)(node_stream_1.pipeline);
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
const limiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 5 * 60 * 1000,
    limit: 100,
    message: {
        error: "Game Over......"
    },
    statusCode: 429,
    legacyHeaders: false
});
const connectionSockets = new Map();
const bootstrap = async () => {
    app.use(express_1.default.json());
    app.use((0, cors_1.default)());
    app.use((0, helmet_1.default)());
    app.use(limiter);
    app.get('/', (req, res) => res.status(200).json({ message: 'Hello World!' }));
    app.use("/users", user_controller_1.default);
    app.use("/posts", post_controller_1.default);
    await (0, connectionDB_1.connectionDB)();
    app.use("{/*demo}", (req, res) => {
        throw new classError_1.AppError(`Invalid URL ${req.originalUrl}`, 404);
    });
    app.use((err, req, res, next) => {
        return res
            .status(err.statusCode || 500)
            .json({ message: err.message, stack: err.stack });
    });
    const server = app.listen(port, () => console.log(`Example app listening on port ${port}!`));
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: "*"
        }
    });
    io.use(async (socket, next) => {
        try {
            console.log("socket connected");
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
            const socketIds = connectionSockets.get(user?._id.toString()) || [];
            socketIds.push(socket.id);
            connectionSockets.set(user._id.toString(), socketIds);
            console.log(connectionSockets);
            socket.user = user;
            socket.decoded = decoded;
            next();
        }
        catch (error) {
            next(error);
        }
    });
    io.on("connection", (socket) => {
        console.log(connectionSockets.get(socket?.user?._id?.toString()));
        socket.on("disconnect", () => {
            let remainingTabs = connectionSockets.get(socket?.user?._id?.toString());
            remainingTabs?.filter((tab) => {
                return tab !== socket.id;
            });
            connectionSockets.delete(socket?.user?._id?.toString());
            io.emit("userDisconnected", { userId: socket?.user?._id?.toString() });
            console.log({ after: connectionSockets });
        });
    });
};
exports.default = bootstrap;
