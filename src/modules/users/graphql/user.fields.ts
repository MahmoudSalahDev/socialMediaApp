import { GraphQLID, GraphQLList, GraphQLNonNull } from "graphql"
import userService from "../user.service"
import { userType } from "./user.type";
import { createUserArgs } from "./user.args";

class UserFields {
    constructor() { }

    query = () => {
        return {
            getOneUser: {
                type: userType,
                args: {
                    id: { type: new GraphQLNonNull(GraphQLID) }
                },
                resolve: userService.getOneUser
            },
            getAllUser: {
                type: new GraphQLList(userType),
                resolve: userService.getAllUser
            },
        }
    };
    mutation = () => {
        return {
            createUser: {
                type: userType,
                args: createUserArgs,
                resolve:userService.createUser
            }
        }
    }

}

export default new UserFields()