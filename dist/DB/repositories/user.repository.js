"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const db_repository_1 = require("./db.repository");
const classError_1 = require("../../utils/classError");
class UserRepository extends db_repository_1.DbRepository {
    model;
    constructor(model) {
        super(model);
        this.model = model;
    }
    async createOneUser(data) {
        const user = await this.model.create(data);
        if (!user) {
            throw new classError_1.AppError("Failed to create User😢");
        }
        return user;
    }
}
exports.UserRepository = UserRepository;
