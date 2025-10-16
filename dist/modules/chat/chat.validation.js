"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGroupChatSchema = void 0;
const zod_1 = __importDefault(require("zod"));
const generalRules_1 = require("../../utils/generalRules");
exports.createGroupChatSchema = {
    body: zod_1.default.strictObject({
        group: zod_1.default.string().min(3).max(20),
        groupImage: zod_1.default.string().optional(),
        participants: zod_1.default.array(generalRules_1.generalRules.id).refine((value) => {
            return new Set(value).size == value?.length;
        }, {
            message: "dublicate participants!!!"
        }),
    }),
};
