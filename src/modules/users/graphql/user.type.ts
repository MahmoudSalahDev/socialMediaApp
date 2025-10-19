import { GraphQLEnumType, GraphQLID, GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from "graphql";
import { GenderType, IUser } from "../../../DB/model/user.model";
import { HydratedDocument } from "mongoose";

export const userType = new GraphQLObjectType({
    name: "user",
    fields: {
        _id: { type: new GraphQLNonNull(GraphQLID) },
        fName: { type: new GraphQLNonNull(GraphQLString) },
        lName: { type: new GraphQLNonNull(GraphQLString) },
        userName: {
            type: new GraphQLNonNull(GraphQLString), resolve: (parent: HydratedDocument<IUser>) => {
                return parent.gender == GenderType.male ? "Mr:" + parent.userName : "Mrs:" + parent.userName
            }
        },
        email: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
        age: { type: new GraphQLNonNull(GraphQLInt) },
        phone: { type: new GraphQLNonNull(GraphQLString) },
        address: { type: new GraphQLNonNull(GraphQLString) },
        friends: { type: new GraphQLList(GraphQLID) },
        gender: {
            type: new GraphQLNonNull(new GraphQLEnumType({
                name: "EnumGenderUser",
                values: {
                    male: { value: GenderType.male },
                    female: { value: GenderType.female },
                }
            }))
        },
    }
})