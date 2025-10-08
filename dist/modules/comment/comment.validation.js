"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCommentSchema = exports.ActionEnum = void 0;
const zod_1 = __importDefault(require("zod"));
const generalRules_1 = require("../../utils/generalRules");
const comment_model_1 = require("../../DB/model/comment.model");
var ActionEnum;
(function (ActionEnum) {
    ActionEnum["like"] = "like";
    ActionEnum["dislike"] = "dislike";
})(ActionEnum || (exports.ActionEnum = ActionEnum = {}));
exports.createCommentSchema = {
    params: zod_1.default.strictObject({
        postId: generalRules_1.generalRules.id,
        commentId: generalRules_1.generalRules.id.optional(),
    }),
    body: zod_1.default.strictObject({
        content: zod_1.default.string().min(5).max(10000).optional(),
        attachments: zod_1.default.array(generalRules_1.generalRules.file).max(2).optional(),
        tags: zod_1.default.array(generalRules_1.generalRules.id).refine((value) => {
            return new Set(value).size == value?.length;
        }, {
            message: "dublicate tags!!!"
        }).optional(),
        onModel: zod_1.default.enum(comment_model_1.onModelEnum),
    }).superRefine((data, ctx) => {
        if (!data.content && !data.attachments?.length) {
            ctx.addIssue({ code: "custom", path: ["content"], message: "content or attachments is required!!" });
        }
    }),
};
