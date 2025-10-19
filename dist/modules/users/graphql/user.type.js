"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userType = void 0;
const graphql_1 = require("graphql");
const user_model_1 = require("../../../DB/model/user.model");
exports.userType = new graphql_1.GraphQLObjectType({
    name: "user",
    fields: {
        _id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID) },
        fName: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        lName: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        userName: {
            type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString), resolve: (parent) => {
                return parent.gender == user_model_1.GenderType.male ? "Mr:" + parent.userName : "Mrs:" + parent.userName;
            }
        },
        email: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        password: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        age: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
        phone: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        address: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
        friends: { type: new graphql_1.GraphQLList(graphql_1.GraphQLID) },
        gender: {
            type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLEnumType({
                name: "EnumGenderUser",
                values: {
                    male: { value: user_model_1.GenderType.male },
                    female: { value: user_model_1.GenderType.female },
                }
            }))
        },
    }
});
