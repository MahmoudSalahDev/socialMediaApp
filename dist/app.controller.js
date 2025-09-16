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
const user_repository_1 = require("./DB/repositories/user.repository");
const user_model_1 = __importDefault(require("./DB/model/user.model"));
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
    app.get('/', (req, res) => res.status(200).json({ message: 'Hello World!' }));
    app.use("/users", user_controller_1.default);
    async function test() {
        const _userModel = new user_repository_1.UserRepository(user_model_1.default);
        const user = await _userModel.findOne({ fName: "mahmoud", paranoid: false }, { age: 25 });
        console.log(user);
    }
    test();
    await (0, connectionDB_1.connectionDB)();
    app.use("{/*demo}", (req, res) => {
        throw new classError_1.AppError(`Invalid URL ${req.originalUrl}`, 404);
    });
    app.use((err, req, res, next) => {
        return res
            .status(err.statusCode || 500)
            .json({ message: err.message, stack: err.stack });
    });
    app.listen(port, () => console.log(`Example app listening on port ${port}!`));
};
exports.default = bootstrap;
