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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_model_1 = __importStar(require("../../DB/model/user.model"));
const user_repository_1 = require("../../DB/repositories/user.repository");
const uuid_1 = require("uuid");
const post_model_1 = __importStar(require("../../DB/model/post.model"));
const post_repository_1 = require("../../DB/repositories/post.repository");
const classError_1 = require("../../utils/classError");
const s3_config_1 = require("../../utils/s3.config");
const post_validation_1 = require("./post.validation");
const comment_repository_1 = require("../../DB/repositories/comment.repository");
const comment_model_1 = __importDefault(require("../../DB/model/comment.model"));
const authentication_1 = require("../../middleware/authentication");
const graphql_1 = require("graphql");
class PostService {
    _userModel = new user_repository_1.UserRepository(user_model_1.default);
    _postModel = new post_repository_1.PostRepository(post_model_1.default);
    _commentModel = new comment_repository_1.CommentRepository(comment_model_1.default);
    constructor() { }
    createPost = async (req, res, next) => {
        if (req?.body?.tags?.length
            &&
                (await this._userModel.find({ filter: { _id: { $in: req?.body?.tags } } })).length !== req?.body?.tags?.length) {
            throw new classError_1.AppError("Invalid user Id", 400);
        }
        let assetFolderId = (0, uuid_1.v4)();
        let attachments = [];
        if (req?.files?.length) {
            attachments = await (0, s3_config_1.uploadFiles)({
                files: req?.files,
                path: `users/${req?.user?._id}/posts/${assetFolderId}`
            });
        }
        const post = await this._postModel.create({
            ...req.body,
            attachments,
            assetFolderId,
            createdBy: req?.user?._id
        });
        if (!post) {
            await (0, s3_config_1.deleteFiles)({
                urls: attachments || []
            });
            throw new classError_1.AppError("Faild to create Post", 500);
        }
        return res.status(201).json({ message: "Post created successfully 👍", post });
    };
    likePost = async (req, res, next) => {
        const { postId } = req?.params;
        const { action } = req?.query;
        let updateQuery = { $addToSet: { likes: req?.user?._id } };
        if (action == post_validation_1.ActionEnum.dislike) {
            updateQuery = { $pull: { likes: req?.user?._id } };
        }
        const post = await this._postModel.findOneAndUpdate({
            _id: postId,
            $or: [
                { availability: post_model_1.availabilityEnum.public },
                { availability: post_model_1.availabilityEnum.private, createdBy: req?.user?._id },
                { availability: post_model_1.availabilityEnum.friends, createdBy: { $in: [...req?.user?.friends || [], req?.user?._id] } },
            ]
        }, updateQuery, { new: true });
        if (!post) {
            throw new classError_1.AppError("Faild to Like Post", 404);
        }
        return res.status(201).json({ message: `${action}  ${action == post_validation_1.ActionEnum.like ? "👍" : "👎"}`, post });
    };
    updatePost = async (req, res, next) => {
        const { postId } = req?.params;
        const post = await this._postModel.findOne({
            _id: postId,
            createdBy: req?.user?._id,
        });
        if (!post) {
            throw new classError_1.AppError("Faild to Update Post or unauthorized!", 404);
        }
        if (req?.body?.content) {
            post.content = req?.body?.content;
        }
        if (req?.body?.availability) {
            post.availability = req?.body?.availability;
        }
        if (req?.body?.allowComment) {
            post.allowComment = req?.body?.allowComment;
        }
        if (req?.files?.length) {
            await (0, s3_config_1.deleteFiles)({
                urls: post.attachments || []
            });
            post.attachments = await (0, s3_config_1.uploadFiles)({
                files: req?.files,
                path: `users/${req?.user?._id}/posts/${post.assetFolderId}`
            });
        }
        if (req?.body?.tags) {
            if (req?.body?.tags?.length
                &&
                    (await this._userModel.find({ filter: { _id: { $in: req?.body?.tags } } })).length !== req?.body?.tags?.length) {
                throw new classError_1.AppError("Invalid user Id", 400);
            }
            post.tags = req?.body?.tags;
        }
        await post.save();
        return res.status(201).json({ message: `Updated`, post });
    };
    getPosts = async (req, res, next) => {
        const posts = await this._postModel.find({
            filter: {}, options: {
                populate: [
                    {
                        path: "comments",
                        match: {
                            commentId: { $exists: false }
                        },
                        populate: {
                            path: "replies",
                        }
                    }
                ]
            }
        });
        return res.status(201).json({ message: `success`, posts });
    };
    getPostById = async (req, res, next) => {
        try {
            const { postId } = req.params;
            const post = await this._postModel.findOne({
                _id: postId,
                deletedAt: { $exists: false }
            }, undefined, {
                populate: [
                    {
                        path: "comments",
                        match: { refId: postId, onModel: "Post", commentId: { $exists: false } },
                        populate: {
                            path: "replies",
                            match: { onModel: "Comment" },
                        },
                    },
                    {
                        path: "createdBy",
                    }
                ],
            });
            if (!post) {
                throw new classError_1.AppError("Post not found", 404);
            }
            return res.status(200).json({
                message: "Post fetched successfully ✅",
                post,
            });
        }
        catch (error) {
            next(error);
        }
    };
    freezePost = async (req, res, next) => {
        try {
            const { postId } = req.params;
            if (![user_model_1.RoleType.admin, user_model_1.RoleType.superAdmin, user_model_1.RoleType.user].includes(req?.user?.role)) {
                throw new classError_1.AppError("Unauthorized", 401);
            }
            const post = await this._postModel.findOneAndUpdate({ _id: postId, deletedAt: { $exists: false } }, {
                deletedAt: new Date(),
                deletedBy: req.user?._id,
                changeCredentials: new Date(),
                $unset: { restoredAt: "", restoredBy: "" }
            }, { new: true });
            if (!post) {
                throw new classError_1.AppError("Post Not Found or already freezed!", 404);
            }
            return res.status(200).json({ message: "Post Freezed" });
        }
        catch (error) {
            next(error);
        }
    };
    unfreezePost = async (req, res, next) => {
        try {
            const { postId } = req.params;
            if (![user_model_1.RoleType.admin, user_model_1.RoleType.superAdmin, user_model_1.RoleType.user].includes(req.user?.role)) {
                throw new classError_1.AppError("Unauthorized", 401);
            }
            const post = await this._postModel.findOneAndUpdate({ _id: postId, deletedAt: { $exists: true }, deletedBy: { $ne: postId } }, {
                $unset: { deletedAt: "", deletedBy: "" },
                restoredBy: req.user?._id,
                restoredAt: new Date(),
                changeCredentials: new Date()
            }, { new: true });
            if (!post) {
                throw new classError_1.AppError("Post Not Found or not freezed!", 404);
            }
            return res.status(200).json({ message: "Post Unfreezed" });
        }
        catch (error) {
            next(error);
        }
    };
    hardDeletePost = async (req, res, next) => {
        try {
            const { postId } = req.params;
            if (![user_model_1.RoleType.admin, user_model_1.RoleType.superAdmin].includes(req?.user?.role) &&
                !req.user?._id) {
                throw new classError_1.AppError("Unauthorized", 401);
            }
            const post = await this._postModel.findOne({ _id: postId });
            if (!post) {
                throw new classError_1.AppError("Post not found", 404);
            }
            if (![user_model_1.RoleType.admin, user_model_1.RoleType.superAdmin].includes(req.user.role) &&
                post.createdBy.toString() !== req.user._id.toString()) {
                throw new classError_1.AppError("Unauthorized", 401);
            }
            const comments = await this._commentModel.find({
                filter: {
                    refId: postId,
                    onModel: "Post",
                },
            });
            for (const comment of comments) {
                await this._commentModel.deleteMany({
                    refId: comment._id,
                    onModel: "Comment",
                });
            }
            await this._commentModel.deleteMany({
                refId: postId,
                onModel: "Post",
            });
            const result = await this._postModel.deleteOne({ _id: postId });
            if (result.deletedCount === 0) {
                throw new classError_1.AppError("Post not found or already deleted", 404);
            }
            return res.status(200).json({ message: "Post and related comments deleted" });
        }
        catch (error) {
            next(error);
        }
    };
    getAllPostsGQL = async (parent, args) => {
        const posts = await this._postModel.find({
            filter: {}
        });
        return posts;
    };
    likePostGQL = async (parent, args, context) => {
        try {
            const { user } = await (0, authentication_1.AuthenticationGraphQL)(context.req.headers.authorization);
            if (!user?._id) {
                throw new graphql_1.GraphQLError("Unauthorized", {
                    extensions: { statusCode: 401, message: "Unauthorized" },
                });
            }
            const { postId, action } = args;
            let updateQuery = { $addToSet: { likes: user._id } };
            if (action === post_validation_1.ActionEnum.dislike) {
                updateQuery = { $pull: { likes: user._id } };
            }
            const post = await this._postModel.findOneAndUpdate({
                _id: postId,
                $or: [
                    { availability: post_model_1.availabilityEnum.public },
                    { availability: post_model_1.availabilityEnum.private, createdBy: user._id },
                    {
                        availability: post_model_1.availabilityEnum.friends,
                        createdBy: {
                            $in: [...(Array.isArray(user.friends) ? user.friends : []), user._id],
                        },
                    },
                ],
            }, updateQuery, { new: true });
            if (!post) {
                throw new graphql_1.GraphQLError("Failed to like post", {
                    extensions: { statusCode: 404, message: "Post not found or access denied" },
                });
            }
            return post;
        }
        catch (err) {
            throw new graphql_1.GraphQLError(err.message || "Something went wrong", {
                extensions: { statusCode: 500 },
            });
        }
    };
}
exports.default = new PostService();
