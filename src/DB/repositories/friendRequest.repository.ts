import {  Model } from "mongoose";
import { DbRepository } from "./db.repository";
import { IFriendRequest } from "../model/friendRequest.model";


export class FriendRequestRepository extends DbRepository<IFriendRequest>{
    constructor(protected override model:Model<IFriendRequest>){
        super(model)
    }

}