"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserArgs = exports.getUserArgs = void 0;
const graphql_1 = require("graphql");
const user_model_1 = require("../../../DB/model/user.model");
exports.getUserArgs = {
    id: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID) }
};
exports.createUserArgs = {
    fName: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    lName: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    email: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    password: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    age: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
    address: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString) },
    gender: {
        type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLEnumType({
            name: "EnumGenderUserr",
            values: {
                male: { value: user_model_1.GenderType.male },
                female: { value: user_model_1.GenderType.female },
            }
        }))
    },
};
