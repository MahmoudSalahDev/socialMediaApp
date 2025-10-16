import z from "zod";
import { generalRules } from "../../utils/generalRules";

export const createGroupChatSchema = {
    body: z.strictObject({
        group: z.string().min(3).max(20),
        groupImage: z.string().optional(),
        participants: z.array(generalRules.id).refine((value)=>{
            return new Set(value).size==value?.length
        },{
            message:"dublicate participants!!!"
        }),
    }),
    // params: z.strictObject({
    //         postId:generalRules.id
    //     }),

}