import z from "zod"
import { generalRules } from "../../utils/generalRules";
import { onModelEnum } from "../../DB/model/comment.model";


export enum ActionEnum{
    like="like",
    dislike="dislike",
}


export const createCommentSchema = {
    params:z.strictObject({
        postId:generalRules.id,
        commentId:generalRules.id.optional(),
    }),
    body: z.strictObject({
        content: z.string().min(5).max(10000).optional(),
        attachments: z.array(generalRules.file).max(2).optional(),
        tags: z.array(generalRules.id).refine((value)=>{
            return new Set(value).size==value?.length
        },{
            message:"dublicate tags!!!"
        }).optional(),
        onModel:z.enum(onModelEnum),
    }).superRefine((data, ctx) => {
        if (!data.content && !data.attachments?.length) {
            ctx.addIssue({ code: "custom", path: ["content"], message: "content or attachments is required!!" });
        }
    }),

}

