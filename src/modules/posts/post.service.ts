import { NextFunction, Request, Response } from "express";
import userModel from "../../DB/model/user.model";
import { UserRepository } from "../../DB/repositories/user.repository";
// import { Compare, Hash } from "../../utils/hash";
// import { eventEmmiter } from "../../utils/event";
// import { generateOTP } from "../../service/sendEmail";
import { v4 as uuidv4 } from "uuid";
// import { OAuth2Client, TokenPayload } from "google-auth-library";
// import { multerCloud, storageEnum } from "../../middleware/multer.cloud";
// import { createUploadFilePresignedUrl, uploadFile, uploadFiles, uploadLargeFile } from "../../utils/s3.config";
import postModel, { availabilityEnum, IPost } from "../../DB/model/post.model";
import { PostRepository } from "../../DB/repositories/post.repository";
import { AppError } from "../../utils/classError";
import { deleteFiles, uploadFiles } from "../../utils/s3.config";
import { ActionEnum, likePostDto, likePostQueryDto } from "./post.validation";
import { UpdateQuery } from "mongoose";

class PostService {
  private _userModel = new UserRepository(userModel);
  private _postModel = new PostRepository(postModel);

  constructor() { }

  //=============createPost============
  createPost = async (req: Request, res: Response, next: NextFunction) => {
    if (req?.body?.tags?.length
      &&
      (await this._userModel.find({ _id: { $in: req?.body?.tags } })).length !== req?.body?.tags?.length
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
        (await this._userModel.find({ _id: { $in: req?.body?.tags } })).length !== req?.body?.tags?.length
      ) {
        throw new AppError("Invalid user Id", 400)
      }
      post.tags = req?.body?.tags
    }

    await post.save()

    return res.status(201).json({ message: `Updated`, post });
  };

}

export default new PostService();
