import { Schema, model, models } from "mongoose";



export enum onModelEnum {
    Post = "Post",
    Comment = "Comment"
}

export interface IComment {
    content?: string,
    attachments?: string[],
    assetFolderId?: string,
    createdBy: Schema.Types.ObjectId,
    refId: Schema.Types.ObjectId ,
    onModel:onModelEnum,
    // commentId?: Schema.Types.ObjectId,
    tags: Schema.Types.ObjectId[],
    likes: Schema.Types.ObjectId[],

    deletedAt?: Date,
    deletedBy?: Schema.Types.ObjectId,
    restoredAt?: Date,
    restoredBy?: Schema.Types.ObjectId,
}


export const commentSchema = new Schema<IComment>({
    content: { type: String, minLength: 5, maxLength: 10000, required: function () { return this.attachments?.length === 0 } },
    attachments: [String],
    assetFolderId: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    refId: { type: Schema.Types.ObjectId, refPath: "onModel", required: true },
    onModel: { type: String, enum:onModelEnum, required: true },
    // commentId: { type: Schema.Types.ObjectId, ref: "Comment" },
    tags: [{ type: Schema.Types.ObjectId, ref: "User" }],
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],

    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    restoredAt: { type: Date },
    restoredBy: { type: Schema.Types.ObjectId, ref: "User" },
},
    {
        timestamps: true,
        strictQuery: true,
        toJSON: {
            virtuals: true
        },
        toObject: {
            virtuals: true
        },
    })

commentSchema.pre(["findOne", "find"], function (next) {
    const query = this.getQuery()
    const { paranoid, ...rest } = query
    if (paranoid === false) {
        this.setQuery({ ...rest })
    } else {
        this.setQuery({ ...rest, deletedAt: { $exists: false } })
    }
    next()
})


commentSchema.virtual("replies", {
    ref: "Comment",
    localField: "_id",
    foreignField: "commentId"
})



const commentModel = models.Comment || model("Comment", commentSchema)

export default commentModel

