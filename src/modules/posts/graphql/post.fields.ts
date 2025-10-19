import { GraphQLID, GraphQLList, GraphQLNonNull, GraphQLEnumType } from "graphql"
import { postType } from "./post.type";
import postService from "../post.service";

const ActionEnum = new GraphQLEnumType({
  name: "ActionEnum",
  values: {
    like: { value: "like" },
    dislike: { value: "dislike" }
  }
});

class PostFields {
  constructor() {}

  query = () => ({
    getAllPosts: {
      type: new GraphQLList(postType),
      resolve: postService.getAllPostsGQL,
    },
  });

  mutation = () => ({
    likePost: {
      type: postType, 
      args: {
        postId: { type: new GraphQLNonNull(GraphQLID) },
        action: { type: new GraphQLNonNull(ActionEnum) },
      },
      resolve: postService.likePostGQL, 
    },
  });
}

export default new PostFields();
