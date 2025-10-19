import { GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql"
import UserFields from "../users/graphql/user.fields"
import postFields from "../posts/graphql/post.fields"





export const schemaGQL = new GraphQLSchema({
    query: new GraphQLObjectType({
        name: "Query",
        // description:
        fields: {
            ...UserFields.query(),
            ...postFields.query()
        }
    }),
    mutation: new GraphQLObjectType({
        name: "mutation",
        fields:{
            ...UserFields.mutation(),
            ...postFields.mutation()
        }
    })
})