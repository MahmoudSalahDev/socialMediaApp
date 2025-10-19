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
const gateway_1 = require("./modules/geteway/gateway");
const s3_config_1 = require("./utils/s3.config");
const chat_controller_1 = __importDefault(require("./modules/chat/chat.controller"));
const express_2 = require("graphql-http/lib/use/express");
const schema_gql_1 = require("./modules/graphql/schema.gql");
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
const bootstrap = async () => {
    app.use(express_1.default.json());
    app.use((0, cors_1.default)());
    app.use((0, helmet_1.default)());
    app.use(limiter);
    const users = [
        { id: 1, name: "ahmed" }
    ];
    app.all('/graphql', (0, express_2.createHandler)({ schema: schema_gql_1.schemaGQL, context: (req) => ({ req }) }));
    app.get('/', (req, res) => res.status(200).json({ message: 'Hello World!' }));
    app.use("/users", user_controller_1.default);
    app.use("/posts", post_controller_1.default);
    app.use("/chat", chat_controller_1.default);
    app.get("/upload/*path", async (req, res, next) => {
        const { path } = req.params;
        const { downloadName } = req.query;
        const Key = path.join("/");
        const result = await (0, s3_config_1.getFile)({
            Key
        });
        const stream = result.Body;
        res.set("cross-origin-resource-policy", "cross-origin");
        res.setHeader("Content-Type", result?.ContentType);
        if (downloadName) {
            res.setHeader("Content-Disposition", `attachment; filename="${downloadName || Key.split("/").pop()}"`);
        }
        await writePipeLine(stream, res);
    });
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
    (0, gateway_1.initializationIo)(server);
};
exports.default = bootstrap;
