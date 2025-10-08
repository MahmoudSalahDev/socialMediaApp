import z from "zod"
import { allowCommentEnum, availabilityEnum } from "../../DB/model/post.model"
import mongoose, { Types } from "mongoose";
import { generalRules } from "../../utils/generalRules";


export enum ActionEnum{
    like="like",
    dislike="dislike",
}


export const createPostSchema = {
    body: z.strictObject({
        content: z.string().min(5).max(10000).optional(),
        attachments: z.array(generalRules.file).max(2).optional(),
        assetFolderId: z.string().optional(),
        allowComment: z.enum(allowCommentEnum).default(allowCommentEnum.allow).optional(),
        availability: z.enum(availabilityEnum).default(availabilityEnum.public).optional(),
        tags: z.array(generalRules.id).refine((value)=>{
            return new Set(value).size==value?.length
        },{
            message:"dublicate tags!!!"
        }).optional(),
    }).superRefine((data, ctx) => {
        if (!data.content && !data.attachments?.length) {
            ctx.addIssue({ code: "custom", path: ["content"], message: "content or attachments is required!!" });
        }
    }),

}

export const updatePostSchema = {
    body: z.strictObject({
        content: z.string().min(5).max(10000).optional(),
        attachments: z.array(generalRules.file).max(2).optional(),
        assetFolderId: z.string().optional(),
        allowComment: z.enum(allowCommentEnum).default(allowCommentEnum.allow).optional(),
        availability: z.enum(availabilityEnum).default(availabilityEnum.public).optional(),
        tags: z.array(generalRules.id).refine((value)=>{
            return new Set(value).size==value?.length
        },{
            message:"dublicate tags!!!"
        }).optional(),
    }).superRefine((data, ctx) => {
        if (!Object.values(data).length) {
            ctx.addIssue({ code: "custom", message: "atleast one field is required" });
        }
    }),

}


export const likePostSchema = {
    params: z.strictObject({
        postId:generalRules.id
    }),
    query: z.strictObject({
        action: z.enum(ActionEnum).default(ActionEnum.like)
    }),
}

export const freezePostSchema = {
    params: z.strictObject({
        postId: z.string().optional(),
    }).required().refine((value) => {
        return value?.postId ? Types.ObjectId.isValid(value.postId) : true
    }, {
        message: "postId is required",
        path: ["postId"]
    })
}

export const hardDeleteSchema = {
    params: z.strictObject({
        postId: z.string().optional(),
    }).required().refine((value) => {
        return value?.postId ? Types.ObjectId.isValid(value.postId) : true
    }, {
        message: "postId is required",
        path: ["postId"]
    })
}



export const unfreezePostSchema = {
    params: z.strictObject({
        postId: z.string(),
    }).required().refine((value) => {
        return value?.postId ? Types.ObjectId.isValid(value.postId) : true
    }, {
        message: "postId is required",
        path: ["postId"]
    })
}


export type likePostDto = z.infer<typeof likePostSchema.params>
export type likePostQueryDto = z.infer<typeof likePostSchema.query>

