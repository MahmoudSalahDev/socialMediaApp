import { NextFunction, Request, Response } from "express";
import userModel, { RoleType } from "../../DB/model/user.model";
import { UserRepository } from "../../DB/repositories/user.repository";

import { v4 as uuidv4 } from "uuid";

import postModel, { availabilityEnum, IPost } from "../../DB/model/post.model";
import { PostRepository } from "../../DB/repositories/post.repository";
import { AppError } from "../../utils/classError";
import { deleteFiles, uploadFiles } from "../../utils/s3.config";
import { ActionEnum, likePostDto, likePostQueryDto } from "./post.validation";
import { UpdateQuery } from "mongoose";
import { CommentRepository } from "../../DB/repositories/comment.repository";
import commentModel from "../../DB/model/comment.model";
import { AuthenticationGraphQL } from "../../middleware/authentication";
import { GraphQLError } from "graphql";


class PostService {
  private _userModel = new UserRepository(userModel);
  private _postModel = new PostRepository(postModel);
  private _commentModel = new CommentRepository(commentModel);


  constructor() { }

  //=============createPost============
  createPost = async (req: Request, res: Response, next: NextFunction) => {
    if (req?.body?.tags?.length
      &&
      (await this._userModel.find({ filter: { _id: { $in: req?.body?.tags } } })).length !== req?.body?.tags?.length
    ) {
      throw new AppError("Invalid user Id", 400)
    }

    let assetFolderId = uuidv4()
    let attachments: string[] = []

    if (req?.files?.length) {
      attachments = await uploadFiles({
        files: req?.files as unknown as Express.Multer.File[],
        path: `users/${req?.user?._id}/posts/${assetFolderId}`
      })
    }

    const post = await this._postModel.create({
      ...req.body,
      attachments,
      assetFolderId,
      createdBy: req?.user?._id
    })

    if (!post) {
      await deleteFiles({
        urls: attachments || []
      })
      throw new AppError("Faild to create Post", 500)
    }

    return res.status(201).json({ message: "Post created successfully 👍", post });
  };

  //=============likePost============
  likePost = async (req: Request, res: Response, next: NextFunction) => {

    const { postId }: likePostDto = req?.params as likePostDto
    const { action }: likePostQueryDto = req?.query as likePostQueryDto


    let updateQuery: UpdateQuery<IPost> = { $addToSet: { likes: req?.user?._id } }
    if (action == ActionEnum.dislike) {
      updateQuery = { $pull: { likes: req?.user?._id } }
    }
    const post = await this._postModel.findOneAndUpdate({
      _id: postId,
      $or: [
        { availability: availabilityEnum.public },
        { availability: availabilityEnum.private, createdBy: req?.user?._id },
        { availability: availabilityEnum.friends, createdBy: { $in: [...req?.user?.friends || [], req?.user?._id] } },

      ]
    },
      updateQuery,
      { new: true }
    )


    if (!post) {

      throw new AppError("Faild to Like Post", 404)
    }


    return res.status(201).json({ message: `${action}  ${action == ActionEnum.like ? "👍" : "👎"}`, post });
  };

  //=============updatePost============
  updatePost = async (req: Request, res: Response, next: NextFunction) => {

    const { postId }: likePostDto = req?.params as likePostDto



    const post = await this._postModel.findOne({
      _id: postId,
      createdBy: req?.user?._id,
      // paranoid:false

    })


    if (!post) {

      throw new AppError("Faild to Update Post or unauthorized!", 404)
    }

    if (req?.body?.content) {
      post.content = req?.body?.content
    }
    if (req?.body?.availability) {
      post.availability = req?.body?.availability
    }
    if (req?.body?.allowComment) {
      post.allowComment = req?.body?.allowComment
    }

    if (req?.files?.length) {
      await deleteFiles({
        urls: post.attachments || []
      })
      post.attachments = await uploadFiles({
        files: req?.files as unknown as Express.Multer.File[],
        path: `users/${req?.user?._id}/posts/${post.assetFolderId}`
      })
    }

    if (req?.body?.tags) {
      if (req?.body?.tags?.length
        &&
        (await this._userModel.find({ filter: { _id: { $in: req?.body?.tags } } })).length !== req?.body?.tags?.length
      ) {
        throw new AppError("Invalid user Id", 400)
      }
      post.tags = req?.body?.tags
    }

    await post.save()

    return res.status(201).json({ message: `Updated`, post });
  };

  //=============getPosts============
  getPosts = async (req: Request, res: Response, next: NextFunction) => {

    // let { page = 1, limit = 5 } = req?.query as unknown as { page: number, limit: number }


    // const {currentPage , docs , count , numberOfPages} = await this._postModel.paginate({ filter: {}, query: { page, limit } })


    // return res.status(201).json({ message: `success`, currentPage,numberOfPages, countDocuments:count, posts:docs  });

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
    })

    // let result = []
    // for (const post of posts) {
    //   const comments = await this._commentModel.find({ filter: { postId: post._id } })
    //   result.push({ ...post, comments })
    // }


    return res.status(201).json({ message: `success`, posts });

  };

  //=============getPostById ============
  getPostById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { postId } = req.params;

      const post = await this._postModel.findOne({
        _id: postId,
        deletedAt: { $exists: false }
      },
        undefined,
        {
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
        throw new AppError("Post not found", 404);
      }

      return res.status(200).json({
        message: "Post fetched successfully ✅",
        post,
      });
    } catch (error) {
      next(error);
    }
  };


  freezePost = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { postId } = req.params as { postId: string };

      if (![RoleType.admin, RoleType.superAdmin, RoleType.user].includes(req?.user?.role!)) {
        throw new AppError("Unauthorized", 401);
      }

      const post = await this._postModel.findOneAndUpdate(
        { _id: postId, deletedAt: { $exists: false } },
        {
          deletedAt: new Date(),
          deletedBy: req.user?._id,
          changeCredentials: new Date(),
          $unset: { restoredAt: "", restoredBy: "" }
        },
        { new: true }
      );

      if (!post) {
        throw new AppError("Post Not Found or already freezed!", 404);
      }

      return res.status(200).json({ message: "Post Freezed" });
    } catch (error) {
      next(error);
    }
  };


  unfreezePost = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { postId } = req.params;

      if (![RoleType.admin, RoleType.superAdmin, RoleType.user].includes(req.user?.role!)) {
        throw new AppError("Unauthorized", 401);
      }

      const post = await this._postModel.findOneAndUpdate(
        { _id: postId, deletedAt: { $exists: true }, deletedBy: { $ne: postId } },
        {
          $unset: { deletedAt: "", deletedBy: "" },
          restoredBy: req.user?._id,
          restoredAt: new Date(),
          changeCredentials: new Date()
        },
        { new: true }
      );

      if (!post) {
        throw new AppError("Post Not Found or not freezed!", 404);
      }

      return res.status(200).json({ message: "Post Unfreezed" });
    } catch (error) {
      next(error);
    }
  };

  hardDeletePost = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { postId } = req.params as { postId: string };

      if (
        ![RoleType.admin, RoleType.superAdmin].includes(req?.user?.role!) &&
        !req.user?._id
      ) {
        throw new AppError("Unauthorized", 401);
      }

      const post = await this._postModel.findOne({ _id: postId });
      if (!post) {
        throw new AppError("Post not found", 404);
      }

      if (
        ![RoleType.admin, RoleType.superAdmin].includes(req.user!.role!) &&
        post.createdBy.toString() !== req.user!._id.toString()
      ) {
        throw new AppError("Unauthorized", 401);
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
        throw new AppError("Post not found or already deleted", 404);
      }

      return res.status(200).json({ message: "Post and related comments deleted" });
    } catch (error) {
      next(error);
    }
  };



  //=========================Graph QL===========

  getAllPostsGQL = async (parent: any, args: any) => {

    const posts = await this._postModel.find({
      filter: {}
    })
    return posts
  }


  likePostGQL = async (parent: any, args: { postId: string; action: ActionEnum }, context: any) => {
    try {

      const { user } = await AuthenticationGraphQL(context.req.headers.authorization);

      if (!user?._id) {
        throw new GraphQLError("Unauthorized", {
          extensions: { statusCode: 401, message: "Unauthorized" },
        });
      }

      const { postId, action } = args;


      let updateQuery: UpdateQuery<IPost> = { $addToSet: { likes: user._id } };
      if (action === ActionEnum.dislike) {
        updateQuery = { $pull: { likes: user._id } };
      }


      const post = await this._postModel.findOneAndUpdate(
        {
          _id: postId,
          $or: [
            { availability: availabilityEnum.public },
            { availability: availabilityEnum.private, createdBy: user._id },
            {
              availability: availabilityEnum.friends,
              createdBy: {
                $in: [...(Array.isArray(user.friends) ? user.friends : []), user._id],
              },
            },
          ],
        },
        updateQuery,
        { new: true }
      );


      if (!post) {
        throw new GraphQLError("Failed to like post", {
          extensions: { statusCode: 404, message: "Post not found or access denied" },
        });
      }


      return post;
    } catch (err) {
      throw new GraphQLError(err.message || "Something went wrong", {
        extensions: { statusCode: 500 },
      });
    }
  };



}

export default new PostService();
