import { GraphQLID, GraphQLList, GraphQLObjectType, GraphQLString } from "graphql";

export const postType = new GraphQLObjectType({
    name: "Post",
    fields: {
        content: { type: GraphQLString },
        attachments: { type: new GraphQLList(GraphQLString) },
        assetFolderId: { type: GraphQLString },
        createdBy: { type: GraphQLID },
        tags: { type: new GraphQLList(GraphQLID) },
        likes: { type: new GraphQLList(GraphQLID) },
    }
})