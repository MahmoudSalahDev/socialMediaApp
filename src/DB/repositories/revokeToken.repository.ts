import {  Model } from "mongoose";
import { DbRepository } from "./db.repository";
import { IRevokeToken } from "../model/revokeToken";


export class RevokeTokenRepository extends DbRepository<IRevokeToken>{
    constructor(protected readonly model:Model<IRevokeToken>){
        super(model)
    }

    
}