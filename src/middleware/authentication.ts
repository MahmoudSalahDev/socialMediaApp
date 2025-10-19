import { NextFunction, Request, Response } from "express"
import { AppError } from "../utils/classError"
import { decodedTokenAndFetchUser, GetSignature, TokenType, } from "../utils/token"
import { GraphQLError } from "graphql"

export const Authentication = (tokenType: TokenType = TokenType.access) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const { authorization } = req.headers
        const [prefix, token] = authorization?.split(" ") || []
        if (!prefix || !token) {
            throw new AppError("Token not exist!", 404)
        }
        const signature = await GetSignature(tokenType, prefix)
        if (!signature) {
            throw new AppError("InValid signature", 400);
        }
        const decoded = await decodedTokenAndFetchUser(token, signature)
        if (!decoded) {
            throw new AppError("InValid Token decoded", 400);
        }
        req.user = decoded?.user
        req.decoded = decoded
        return next()
    }
}

export const AuthenticationGraphQL = async (authorization: string, tokenType: TokenType = TokenType.access,) => {

    const [prefix, token] = authorization?.split(" ") || []
    if (!prefix || !token) {
        throw new GraphQLError("Token not exist!", {
            extensions: {
                message: "Token not exist!",
                statusCode: 404
            }
        });
    }
    const signature = await GetSignature(tokenType, prefix)
    if (!signature) {
        throw new GraphQLError("InValid signature", {
            extensions: {
                message: "InValid signature",
                statusCode: 400
            }
        });
    }
    const {user , decoded} = await decodedTokenAndFetchUser(token, signature)
    if (!decoded) {
        throw new GraphQLError("InValid Token decoded", {
            extensions: {
                message: "InValid Token decoded",
                statusCode: 400
            }
        });
    }
    
    return {user , decoded}

}