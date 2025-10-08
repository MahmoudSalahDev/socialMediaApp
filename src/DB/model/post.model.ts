import { Schema, model, models } from "mongoose";



export enum allowCommentEnum {
    allow = "allow",
    deny = "deny"
}
export enum availabilityEnum {
    public = "public",
    private = "private",
    friends = "friends",
}

export interface IPost {
    content?: string,
    attachments?: string[],
    assetFolderId?: string,
    createdBy: Schema.Types.ObjectId,
    tags: Schema.Types.ObjectId[],
    likes: Schema.Types.ObjectId[],
    allowComment: allowCommentEnum,
    availability: availabilityEnum,
    changeCredentials?: Date,
    deletedAt?: Date,
    deletedBy?: Schema.Types.ObjectId,
    restoredAt?: Date,
    restoredBy?: Schema.Types.ObjectId,
}


export const postSchema = new Schema<IPost>({
    content: { type: String, minLength: 5, maxLength: 10000, required: function () { return this.attachments?.length === 0 } },
    attachments: [String],
    assetFolderId: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tags: [{ type: Schema.Types.ObjectId, ref: "User"}],
    likes: [{ type: Schema.Types.ObjectId, ref: "User"}],
    allowComment: {type:String , enum:allowCommentEnum , default:allowCommentEnum.allow},
    availability: {type:String , enum:availabilityEnum , default:availabilityEnum.public},
    changeCredentials: { type: Date },
    deletedAt: {type:Date  },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User"},
    restoredAt: {type:Date  },
    restoredBy: { type: Schema.Types.ObjectId, ref: "User"},
},
{
    timestamps:true,
    toJSON:{
        virtuals:true
    },
    toObject:{
        virtuals:true
    },
    strictQuery:true
})

postSchema.pre(["findOne","find"],function(next){
    const query = this.getQuery()
    const {paranoid, ...rest} = query
    if(paranoid===false){
        this.setQuery({...rest})
    }else{
        this.setQuery({...rest,deletedAt:{$exists:false}})
    }
    next()
})

postSchema.virtual("comments",{
    ref:"Comment",
    localField:"_id",
    foreignField:"postId"
})



const postModel = models.Post||model("Post", postSchema)

export default postModel