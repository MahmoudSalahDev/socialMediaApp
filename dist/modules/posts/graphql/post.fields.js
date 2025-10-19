"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const post_type_1 = require("./post.type");
const post_service_1 = __importDefault(require("../post.service"));
const ActionEnum = new graphql_1.GraphQLEnumType({
    name: "ActionEnum",
    values: {
        like: { value: "like" },
        dislike: { value: "dislike" }
    }
});
class PostFields {
    constructor() { }
    query = () => ({
        getAllPosts: {
            type: new graphql_1.GraphQLList(post_type_1.postType),
            resolve: post_service_1.default.getAllPostsGQL,
        },
    });
    mutation = () => ({
        likePost: {
            type: post_type_1.postType,
            args: {
                postId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID) },
                action: { type: new graphql_1.GraphQLNonNull(ActionEnum) },
            },
            resolve: post_service_1.default.likePostGQL,
        },
    });
}
exports.default = new PostFields();
