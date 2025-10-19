"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postType = void 0;
const graphql_1 = require("graphql");
exports.postType = new graphql_1.GraphQLObjectType({
    name: "Post",
    fields: {
        content: { type: graphql_1.GraphQLString },
        attachments: { type: new graphql_1.GraphQLList(graphql_1.GraphQLString) },
        assetFolderId: { type: graphql_1.GraphQLString },
        createdBy: { type: graphql_1.GraphQLID },
        tags: { type: new graphql_1.GraphQLList(graphql_1.GraphQLID) },
        likes: { type: new graphql_1.GraphQLList(graphql_1.GraphQLID) },
    }
});
