import { GraphQLEnumType, GraphQLID, GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLString } from "graphql";
import { GenderType } from "../../../DB/model/user.model";


export const getUserArgs = {
    id: { type: new GraphQLNonNull(GraphQLID) }
}


export const createUserArgs = {
    fName: { type: new GraphQLNonNull(GraphQLString) },
    lName: { type: new GraphQLNonNull(GraphQLString) },
    // userName: { type: new GraphQLNonNull(GraphQLString) },
    email: { type: new GraphQLNonNull(GraphQLString) },
    password: { type: new GraphQLNonNull(GraphQLString) },
    age: { type: new GraphQLNonNull(GraphQLInt) },
    // phone: { type: new GraphQLNonNull(GraphQLString) },
    address: { type: new GraphQLNonNull(GraphQLString) },
    // friends: { type: new GraphQLList(GraphQLID) },
    gender: {
        type: new GraphQLNonNull(new GraphQLEnumType({
            name: "EnumGenderUserr",
            values: {
                male: { value: GenderType.male },
                female: { value: GenderType.female },
            }
        }))
    },
}