"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unfreezePostSchema = exports.hardDeleteSchema = exports.freezePostSchema = exports.likePostSchema = exports.updatePostSchema = exports.createPostSchema = exports.ActionEnum = void 0;
const zod_1 = __importDefault(require("zod"));
const post_model_1 = require("../../DB/model/post.model");
const mongoose_1 = require("mongoose");
const generalRules_1 = require("../../utils/generalRules");
var ActionEnum;
(function (ActionEnum) {
    ActionEnum["like"] = "like";
    ActionEnum["dislike"] = "dislike";
})(ActionEnum || (exports.ActionEnum = ActionEnum = {}));
exports.createPostSchema = {
    body: zod_1.default.strictObject({
        content: zod_1.default.string().min(5).max(10000).optional(),
        attachments: zod_1.default.array(generalRules_1.generalRules.file).max(2).optional(),
        assetFolderId: zod_1.default.string().optional(),
        allowComment: zod_1.default.enum(post_model_1.allowCommentEnum).default(post_model_1.allowCommentEnum.allow).optional(),
        availability: zod_1.default.enum(post_model_1.availabilityEnum).default(post_model_1.availabilityEnum.public).optional(),
        tags: zod_1.default.array(generalRules_1.generalRules.id).refine((value) => {
            return new Set(value).size == value?.length;
        }, {
            message: "dublicate tags!!!"
        }).optional(),
    }).superRefine((data, ctx) => {
        if (!data.content && !data.attachments?.length) {
            ctx.addIssue({ code: "custom", path: ["content"], message: "content or attachments is required!!" });
        }
    }),
};
exports.updatePostSchema = {
    body: zod_1.default.strictObject({
        content: zod_1.default.string().min(5).max(10000).optional(),
        attachments: zod_1.default.array(generalRules_1.generalRules.file).max(2).optional(),
        assetFolderId: zod_1.default.string().optional(),
        allowComment: zod_1.default.enum(post_model_1.allowCommentEnum).default(post_model_1.allowCommentEnum.allow).optional(),
        availability: zod_1.default.enum(post_model_1.availabilityEnum).default(post_model_1.availabilityEnum.public).optional(),
        tags: zod_1.default.array(generalRules_1.generalRules.id).refine((value) => {
            return new Set(value).size == value?.length;
        }, {
            message: "dublicate tags!!!"
        }).optional(),
    }).superRefine((data, ctx) => {
        if (!Object.values(data).length) {
            ctx.addIssue({ code: "custom", message: "atleast one field is required" });
        }
    }),
};
exports.likePostSchema = {
    params: zod_1.default.strictObject({
        postId: generalRules_1.generalRules.id
    }),
    query: zod_1.default.strictObject({
        action: zod_1.default.enum(ActionEnum).default(ActionEnum.like)
    }),
};
exports.freezePostSchema = {
    params: zod_1.default.strictObject({
        postId: zod_1.default.string().optional(),
    }).required().refine((value) => {
        return value?.postId ? mongoose_1.Types.ObjectId.isValid(value.postId) : true;
    }, {
        message: "postId is required",
        path: ["postId"]
    })
};
exports.hardDeleteSchema = {
    params: zod_1.default.strictObject({
        postId: zod_1.default.string().optional(),
    }).required().refine((value) => {
        return value?.postId ? mongoose_1.Types.ObjectId.isValid(value.postId) : true;
    }, {
        message: "postId is required",
        path: ["postId"]
    })
};
exports.unfreezePostSchema = {
    params: zod_1.default.strictObject({
        postId: zod_1.default.string(),
    }).required().refine((value) => {
        return value?.postId ? mongoose_1.Types.ObjectId.isValid(value.postId) : true;
    }, {
        message: "postId is required",
        path: ["postId"]
    })
};
