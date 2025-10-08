import { NextFunction, Request, Response } from "express";
import userModel, { RoleType } from "../../DB/model/user.model";
import { UserRepository } from "../../DB/repositories/user.repository";
import { v4 as uuidv4 } from "uuid";
import postModel, { allowCommentEnum, availabilityEnum, IPost } from "../../DB/model/post.model";
import { PostRepository } from "../../DB/repositories/post.repository";
import { AppError } from "../../utils/classError";
import { deleteFiles, uploadFiles } from "../../utils/s3.config";
import { CommentRepository } from "../../DB/repositories/comment.repository";
import commentModel, { IComment, onModelEnum } from "../../DB/model/comment.model";
import { HydratedDocument, Schema, Types } from "mongoose";
import { populate } from "dotenv";



class CommentService {
  private _userModel = new UserRepository(userModel);
  private _postModel = new PostRepository(postModel);
  private _commentModel = new CommentRepository(commentModel);

  constructor() { }


  //=============createComment============
  createComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { postId, commentId } = req.params;
      let { content, tags, attachments, onModel } = req.body;

      let doc: HydratedDocument<IPost | IComment> | null = null;

      const userFriends = Array.isArray(req?.user?.friends) ? req.user.friends : [];

      if (onModel === onModelEnum.Comment) {
        if (!commentId) {
          return next(new AppError("commentId is required for replies", 400));
        }

        const comment = await this._commentModel.findOne(
          { _id: commentId, refId: postId },
          undefined,
          {
            populate: {
              path: "refId",
              match: {
                allowComment: allowCommentEnum.allow,
                $or: [
                  { availability: availabilityEnum.public },
                  { availability: availabilityEnum.private, createdBy: req?.user?._id },
                  { availability: availabilityEnum.friends, createdBy: { $in: [...userFriends, req?.user?._id] } },
                ],
              },
            },
          }
        );

        if (!comment?.refId) {
          return next(new AppError("Comment not found or unauthorized", 404));
        }

        doc = comment;
      }

      else if (onModel === onModelEnum.Post) {
        if (commentId) {
          return next(new AppError("commentId is not allowed when commenting on a post", 400));
        }

        const post = await this._postModel.findOne({
          _id: postId,
          $or: [
            { availability: availabilityEnum.public },
            { availability: availabilityEnum.private, createdBy: req?.user?._id },
            { availability: availabilityEnum.friends, createdBy: { $in: [...userFriends, req?.user?._id] } },
          ],
          allowComment: allowCommentEnum.allow,
        });

        if (!post) {
          return next(new AppError("Post not found or commenting not allowed", 404));
        }

        doc = post;
      }

      if (
        tags?.length &&
        (await this._userModel.find({ filter: { _id: { $in: tags } } })).length !== tags.length
      ) {
        throw new AppError("One or more tags are invalid", 400);
      }


      const assetFolderId = uuidv4();

      if (attachments?.length) {
        attachments = await uploadFiles({
          files: req?.files as unknown as Express.Multer.File[],
          path: `users/${doc?.createdBy}/posts/${doc?.assetFolderId}/comments/${assetFolderId}`,
        });
      }

      const comment = await this._commentModel.create({
        content,
        tags,
        attachments,
        assetFolderId,
        refId: doc?._id as unknown as Schema.Types.ObjectId,
        onModel,
        createdBy: req?.user?._id as unknown as Schema.Types.ObjectId,
      });

      if (!comment) {
        await deleteFiles({ urls: attachments || [] });
        throw new AppError("Failed to create Comment", 500);
      }

      return res.status(201).json({
        message: "Comment created successfully 👍",
        comment,
      });
    } catch (error) {
      next(error);
    }
  };


  updateComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { commentId } = req.params as { commentId: string };
      let { content, tags, attachments } = req.body;

      const comment = await this._commentModel.findOne({ _id: commentId, deletedAt: { $exists: false } });
      if (!comment) {
        throw new AppError("Comment not found or deleted!", 404);
      }

      if (
        ![RoleType.admin, RoleType.superAdmin].includes(req.user!.role!) &&
        comment.createdBy.toString() !== req.user!._id.toString()
      ) {
        throw new AppError("Unauthorized to edit this comment!", 401);
      }

      if (
        tags?.length &&
        (await this._userModel.find({ filter: { _id: { $in: tags } } })).length !== tags.length
      ) {
        throw new AppError("Some tags are invalid", 400);
      }

      if (req.files && (req.files as Express.Multer.File[]).length > 0) {
        const uploadedFiles = await uploadFiles({
          files: req.files as Express.Multer.File[],
          path: `users/${req.user?._id}/posts/${comment.assetFolderId}/comments/${comment._id}`
        });

        if (comment.attachments?.length) {
          await deleteFiles({ urls: comment.attachments });
        }

        attachments = uploadedFiles;
      }

      const updatedComment = await this._commentModel.findOneAndUpdate(
        { _id: commentId },
        {
          content: content ?? comment.content,
          tags: tags ?? comment.tags,
          attachments: attachments ?? comment.attachments,
          changeCredentials: new Date(),
        },
        { new: true }
      );

      if (!updatedComment) {
        throw new AppError("Failed to update comment!", 500);
      }

      return res.status(200).json({
        message: "Comment updated successfully ✏️",
        comment: updatedComment,
      });
    } catch (error) {
      next(error);
    }
  };


  freezeComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { commentId } = req.params as { commentId: string };

      if (![RoleType.admin, RoleType.superAdmin, RoleType.user].includes(req?.user?.role!)) {
        throw new AppError("Unauthorized", 401);
      }

      const comment = await this._commentModel.findOne({ _id: commentId, deletedAt: { $exists: false } });
      if (!comment) {
        throw new AppError("Comment not found or already freezed!", 404);
      }

      await this._commentModel.updateOne(
        { _id: commentId },
        {
          deletedAt: new Date(),
          deletedBy: req.user?._id,
          changeCredentials: new Date(),
          $unset: { restoredAt: "", restoredBy: "" },
        }
      );

      await this._commentModel.updateOne(
        { refId: commentId, onModel: "Comment", deletedAt: { $exists: false } },
        {
          deletedAt: new Date(),
          deletedBy: req.user?._id,
          changeCredentials: new Date(),
          $unset: { restoredAt: "", restoredBy: "" },
        }
      );

      return res.status(200).json({ message: "Comment and its replies freezed successfully" });
    } catch (error) {
      next(error);
    }
  };

  unfreezeComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { commentId } = req.params as { commentId: string };

      if (![RoleType.admin, RoleType.superAdmin, RoleType.user].includes(req?.user?.role!)) {
        throw new AppError("Unauthorized", 401);
      }

      const comment = await this._commentModel.findOne({
        _id: commentId,
        paranoid: false, // 👈 bypass soft-delete filter
        deletedAt: { $exists: true },
      });

      if (!comment) {
        throw new AppError("Comment not found or already active!", 404);
      }

      await this._commentModel.updateOne(
        { _id: commentId },
        {
          $unset: { deletedAt: "", deletedBy: "" },
          restoredAt: new Date(),
          restoredBy: req.user?._id,
          changeCredentials: new Date(),
        }
      );

      await this._commentModel.updateOne(
        { refId: commentId, onModel: "Comment", deletedAt: { $exists: true } },
        {
          $unset: { deletedAt: "", deletedBy: "" },
          restoredAt: new Date(),
          restoredBy: req.user?._id,
          changeCredentials: new Date(),
        }
      );

      return res.status(200).json({ message: "Comment and its replies restored successfully" });
    } catch (error) {
      next(error);
    }
  };

  hardDeleteComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { commentId } = req.params as { commentId: string };

      if (
        ![RoleType.admin, RoleType.superAdmin].includes(req?.user?.role!) &&
        !req.user?._id
      ) {
        throw new AppError("Unauthorized", 401);
      }

      const comment = await this._commentModel.findOne({ _id: commentId });
      if (!comment) {
        throw new AppError("Comment not found", 404);
      }

      if (
        ![RoleType.admin, RoleType.superAdmin].includes(req.user!.role!) &&
        comment.createdBy.toString() !== req.user!._id.toString()
      ) {
        throw new AppError("Unauthorized", 401);
      }

      await this._commentModel.deleteMany({
        refId: commentId,
        onModel: "Comment",
      });

      const result = await this._commentModel.deleteOne({ _id: commentId });

      if (result.deletedCount === 0) {
        throw new AppError("Comment not found or already deleted", 404);
      }

      return res.status(200).json({ message: "Comment and its replies deleted permanently" });
    } catch (error) {
      next(error);
    }
  };

  getCommentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { commentId } = req.params;

      const comment = await this._commentModel.findOne(
        { _id: commentId, deletedAt: { $exists: false } },
        undefined,
        {
          populate: [
            {
              path: "createdBy",
              select: "_id fName lName",
            },
          ],
        }
      );

      if (!comment) {
        throw new AppError("Comment not found or deleted!", 404);
      }

      return res.status(200).json({
        message: "Comment fetched successfully ✅",
        comment,
      });
    } catch (error) {
      next(error);
    }
  };

  getCommentWithReplies = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { commentId } = req.params;


      const comment = await this._commentModel.findOne({
        _id: commentId,
        deletedAt: { $exists: false },
      });

      if (!comment) {
        throw new AppError("Comment not found or deleted!", 404);
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
    } catch (error) {
      next(error);
    }
  };

















}

export default new CommentService();

