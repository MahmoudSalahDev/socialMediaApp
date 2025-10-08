import {  Model } from "mongoose";
import { DbRepository } from "./db.repository";
import { AppError } from "../../utils/classError";
import { IPost } from "../model/post.model";
import { IComment } from "../model/comment.model";


export class CommentRepository extends DbRepository<IComment>{
    constructor(protected override model:Model<IComment>){
        super(model)
    }

}