import { NextFunction, Request, Response } from "express";
import { RoleType } from "../DB/model/user.model";
import { AppError } from "../utils/classError";
import { GraphQLError } from "graphql";

export const Authorization = ({accessRoles=[]}:{accessRoles:RoleType[]})=>{
    return (req: Request, res: Response, next: NextFunction)=>{
        if(!accessRoles.includes(req?.user?.role!)){
            throw new AppError("Unauthorized!!😡",401)
        }
        next()
    }

}

export const AuthorizationGraphQL = ({accessRoles=[] , role}:{accessRoles:RoleType[], role:RoleType})=>{
        if(!accessRoles.includes(role)){
            throw new GraphQLError("Unauthorized!!😡", {
                        extensions: {
                            message: "Unauthorized!!😡",
                            statusCode: 401
                        }
                    });
        }
        
        return true

}