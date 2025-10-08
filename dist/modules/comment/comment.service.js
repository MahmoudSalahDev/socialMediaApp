"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const user_model_1 = __importStar(require("../../DB/model/user.model"));
const user_repository_1 = require("../../DB/repositories/user.repository");
const uuid_1 = require("uuid");
const post_model_1 = __importStar(require("../../DB/model/post.model"));
const post_repository_1 = require("../../DB/repositories/post.repository");
const classError_1 = require("../../utils/classError");
const s3_config_1 = require("../../utils/s3.config");
const comment_repository_1 = require("../../DB/repositories/comment.repository");
const comment_model_1 = __importStar(require("../../DB/model/comment.model"));
class CommentService {
    _userModel = new user_repository_1.UserRepository(user_model_1.default);
    _postModel = new post_repository_1.PostRepository(post_model_1.default);
    _commentModel = new comment_repository_1.CommentRepository(comment_model_1.default);
    constructor() { }
    createComment = async (req, res, next) => {
        try {
            const { postId, commentId } = req.params;
            let { content, tags, attachments, onModel } = req.body;
            let doc = null;
            const userFriends = Array.isArray(req?.user?.friends) ? req.user.friends : [];
            if (onModel === comment_model_1.onModelEnum.Comment) {
                if (!commentId) {
                    return next(new classError_1.AppError("commentId is required for replies", 400));
                }
                const comment = await this._commentModel.findOne({ _id: commentId, refId: postId }, undefined, {
                    populate: {
                        path: "refId",
                        match: {
                            allowComment: post_model_1.allowCommentEnum.allow,
                            $or: [
                                { availability: post_model_1.availabilityEnum.public },
                                { availability: post_model_1.availabilityEnum.private, createdBy: req?.user?._id },
                                { availability: post_model_1.availabilityEnum.friends, createdBy: { $in: [...userFriends, req?.user?._id] } },
                            ],
                        },
                    },
                });
                if (!comment?.refId) {
                    return next(new classError_1.AppError("Comment not found or unauthorized", 404));
                }
                doc = comment;
            }
            else if (onModel === comment_model_1.onModelEnum.Post) {
                if (commentId) {
                    return next(new classError_1.AppError("commentId is not allowed when commenting on a post", 400));
                }
                const post = await this._postModel.findOne({
                    _id: postId,
                    $or: [
                        { availability: post_model_1.availabilityEnum.public },
                        { availability: post_model_1.availabilityEnum.private, createdBy: req?.user?._id },
                        { availability: post_model_1.availabilityEnum.friends, createdBy: { $in: [...userFriends, req?.user?._id] } },
                    ],
                    allowComment: post_model_1.allowCommentEnum.allow,
                });
                if (!post) {
                    return next(new classError_1.AppError("Post not found or commenting not allowed", 404));
                }
                doc = post;
            }
            if (tags?.length &&
                (await this._userModel.find({ filter: { _id: { $in: tags } } })).length !== tags.length) {
                throw new classError_1.AppError("One or more tags are invalid", 400);
            }
            const assetFolderId = (0, uuid_1.v4)();
            if (attachments?.length) {
                attachments = await (0, s3_config_1.uploadFiles)({
                    files: req?.files,
                    path: `users/${doc?.createdBy}/posts/${doc?.assetFolderId}/comments/${assetFolderId}`,
                });
            }
            const comment = await this._commentModel.create({
                content,
                tags,
                attachments,
                assetFolderId,
                refId: doc?._id,
                onModel,
                createdBy: req?.user?._id,
            });
            if (!comment) {
                await (0, s3_config_1.deleteFiles)({ urls: attachments || [] });
                throw new classError_1.AppError("Failed to create Comment", 500);
            }
            return res.status(201).json({
                message: "Comment created successfully 👍",
                comment,
            });
        }
        catch (error) {
            next(error);
        }
    };
    updateComment = async (req, res, next) => {
        try {
            const { commentId } = req.params;
            let { content, tags, attachments } = req.body;
            const comment = await this._commentModel.findOne({ _id: commentId, deletedAt: { $exists: false } });
            if (!comment) {
                throw new classError_1.AppError("Comment not found or deleted!", 404);
            }
            if (![user_model_1.RoleType.admin, user_model_1.RoleType.superAdmin].includes(req.user.role) &&
                comment.createdBy.toString() !== req.user._id.toString()) {
                throw new classError_1.AppError("Unauthorized to edit this comment!", 401);
            }
            if (tags?.length &&
                (await this._userModel.find({ filter: { _id: { $in: tags } } })).length !== tags.length) {
                throw new classError_1.AppError("Some tags are invalid", 400);
            }
            if (req.files && req.files.length > 0) {
                const uploadedFiles = await (0, s3_config_1.uploadFiles)({
                    files: req.files,
                    path: `users/${req.user?._id}/posts/${comment.assetFolderId}/comments/${comment._id}`
                });
                if (comment.attachments?.length) {
                    await (0, s3_config_1.deleteFiles)({ urls: comment.attachments });
                }
                attachments = uploadedFiles;
            }
            const updatedComment = await this._commentModel.findOneAndUpdate({ _id: commentId }, {
                content: content ?? comment.content,
                tags: tags ?? comment.tags,
                attachments: attachments ?? comment.attachments,
                changeCredentials: new Date(),
            }, { new: true });
            if (!updatedComment) {
                throw new classError_1.AppError("Failed to update comment!", 500);
            }
            return res.status(200).json({
                message: "Comment updated successfully ✏️",
                comment: updatedComment,
            });
        }
        catch (error) {
            next(error);
        }
    };
    freezeComment = async (req, res, next) => {
        try {
            const { commentId } = req.params;
            if (![user_model_1.RoleType.admin, user_model_1.RoleType.superAdmin, user_model_1.RoleType.user].includes(req?.user?.role)) {
                throw new classError_1.AppError("Unauthorized", 401);
            }
            const comment = await this._commentModel.findOne({ _id: commentId, deletedAt: { $exists: false } });
            if (!comment) {
                throw new classError_1.AppError("Comment not found or already freezed!", 404);
            }
            await this._commentModel.updateOne({ _id: commentId }, {
                deletedAt: new Date(),
                deletedBy: req.user?._id,
                changeCredentials: new Date(),
                $unset: { restoredAt: "", restoredBy: "" },
            });
            await this._commentModel.updateOne({ refId: commentId, onModel: "Comment", deletedAt: { $exists: false } }, {
                deletedAt: new Date(),
                deletedBy: req.user?._id,
                changeCredentials: new Date(),
                $unset: { restoredAt: "", restoredBy: "" },
            });
            return res.status(200).json({ message: "Comment and its replies freezed successfully" });
        }
        catch (error) {
            next(error);
        }
    };
    unfreezeComment = async (req, res, next) => {
        try {
            const { commentId } = req.params;
            if (![user_model_1.RoleType.admin, user_model_1.RoleType.superAdmin, user_model_1.RoleType.user].includes(req?.user?.role)) {
                throw new classError_1.AppError("Unauthorized", 401);
            }
            const comment = await this._commentModel.findOne({
                _id: commentId,
                paranoid: false,
                deletedAt: { $exists: true },
            });
            if (!comment) {
                throw new classError_1.AppError("Comment not found or already active!", 404);
            }
            await this._commentModel.updateOne({ _id: commentId }, {
                $unset: { deletedAt: "", deletedBy: "" },
                restoredAt: new Date(),
                restoredBy: req.user?._id,
                changeCredentials: new Date(),
            });
            await this._commentModel.updateOne({ refId: commentId, onModel: "Comment", deletedAt: { $exists: true } }, {
                $unset: { deletedAt: "", deletedBy: "" },
                restoredAt: new Date(),
                restoredBy: req.user?._id,
                changeCredentials: new Date(),
            });
            return res.status(200).json({ message: "Comment and its replies restored successfully" });
        }
        catch (error) {
            next(error);
        }
    };
    hardDeleteComment = async (req, res, next) => {
        try {
            const { commentId } = req.params;
            if (![user_model_1.RoleType.admin, user_model_1.RoleType.superAdmin].includes(req?.user?.role) &&
                !req.user?._id) {
                throw new classError_1.AppError("Unauthorized", 401);
            }
            const comment = await this._commentModel.findOne({ _id: commentId });
            if (!comment) {
                throw new classError_1.AppError("Comment not found", 404);
            }
            if (![user_model_1.RoleType.admin, user_model_1.RoleType.superAdmin].includes(req.user.role) &&
                comment.createdBy.toString() !== req.user._id.toString()) {
                throw new classError_1.AppError("Unauthorized", 401);
            }
            await this._commentModel.deleteMany({
                refId: commentId,
                onModel: "Comment",
            });
            const result = await this._commentModel.deleteOne({ _id: commentId });
            if (result.deletedCount === 0) {
                throw new classError_1.AppError("Comment not found or already deleted", 404);
            }
            return res.status(200).json({ message: "Comment and its replies deleted permanently" });
        }
        catch (error) {
            next(error);
        }
    };
    getCommentById = async (req, res, next) => {
        try {
            const { commentId } = req.params;
            const comment = await this._commentModel.findOne({ _id: commentId, deletedAt: { $exists: false } }, undefined, {
                populate: [
                    {
                        path: "createdBy",
                        select: "_id fName lName",
                    },
                ],
            });
            if (!comment) {
                throw new classError_1.AppError("Comment not found or deleted!", 404);
            }
            return res.status(200).json({
                message: "Comment fetched successfully ✅",
                comment,
            });
        }
        catch (error) {
            next(error);
        }
    };
    getCommentWithReplies = async (req, res, next) => {
        try {
            const { commentId } = req.params;
            const comment = await this._commentModel.findOne({
                _id: commentId,
                deletedAt: { $exists: false },
            });
            if (!comment) {
                throw new classError_1.AppError("Comment not found or deleted!", 404);
            }
            const replies = await this._commentModel.find({
                filter: {
                    refId: commentId,
                    onModel: "Comment",
                    deletedAt: { $exists: false },
                }
            });
            const result = {
                ...comment.toObject(),
                replies,
            };
            return res.status(200).json({
                message: "Comment (with replies) fetched successfully ✅",
                comment: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.default = new CommentService();
