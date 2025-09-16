"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevokeTokenRepository = void 0;
const db_repository_1 = require("./db.repository");
class RevokeTokenRepository extends db_repository_1.DbRepository {
    model;
    constructor(model) {
        super(model);
        this.model = model;
    }
}
exports.RevokeTokenRepository = RevokeTokenRepository;
