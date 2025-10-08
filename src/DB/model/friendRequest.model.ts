import { Schema, model, models } from "mongoose";



// export enum onModelEnum {
//     Post = "Post",
//     Comment = "Comment"
// }

export interface IFriendRequest {

    createdBy: Schema.Types.ObjectId,
    sendTo: Schema.Types.ObjectId,


    acceptedAt?: Date,

}


export const friendRequestSchema = new Schema<IFriendRequest>({

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sendTo: { type: Schema.Types.ObjectId, ref: "User", required: true },



    acceptedAt: { type: Date },

},
    {
        timestamps: true,
        strictQuery: true,
     
    })

friendRequestSchema.pre(["findOne", "find"], function (next) {
    const query = this.getQuery()
    const { paranoid, ...rest } = query
    if (paranoid === false) {
        this.setQuery({ ...rest })
    } else {
        this.setQuery({ ...rest, deletedAt: { $exists: false } })
    }
    next()
})



const friendRequestModel = models.FriendRequest || model("FriendRequest", friendRequestSchema)

export default friendRequestModel

