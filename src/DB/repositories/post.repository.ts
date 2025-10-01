import {  Model } from "mongoose";
import { DbRepository } from "./db.repository";
import { AppError } from "../../utils/classError";
import { IPost } from "../model/post.model";


export class PostRepository extends DbRepository<IPost>{
    constructor(protected readonly model:Model<IPost>){
        super(model)
    }

}