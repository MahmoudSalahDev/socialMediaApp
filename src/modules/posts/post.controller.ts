import { Router } from "express";
import PS from "./post.service";
import { Validation } from "../../middleware/validation";
import * as PV from "./post.validation";
import { Authentication } from "../../middleware/authentication";
import { fileValidation, multerCloud, storageEnum } from "../../middleware/multer.cloud";
import commentRouter from "../comment/comment.controller";
import { TokenType } from "../../utils/token";

const postRouter = Router({})

postRouter.use("/:postId/comments{/:commentId/reply}", commentRouter)



postRouter.post("/",
    Authentication(),
    multerCloud({ fileTypes: fileValidation.image }).array("attachments", 2),
    Validation(PV.createPostSchema),
    PS.createPost)

postRouter.patch("/:postId", Authentication(), Validation(PV.likePostSchema), PS.likePost)

postRouter.patch("/update/:postId",
    Authentication(),
    multerCloud({ fileTypes: fileValidation.image }).array("attachments", 2),
    Validation(PV.updatePostSchema),
    PS.updatePost)

postRouter.delete("/freezePost/:postId",
    Authentication(TokenType.access),
    Validation(PV.freezePostSchema),
    PS.freezePost)

postRouter.patch("/unfreezePost/:postId",
    Authentication(TokenType.access),
    Validation(PV.unfreezePostSchema),
    PS.unfreezePost)

postRouter.delete("/hard-delete/:postId",
    Authentication(TokenType.access),
    Validation(PV.hardDeleteSchema),
    PS.hardDeletePost);


postRouter.get("/",
    Authentication(),
    PS.getPosts)

postRouter.get("/:postId",
    Authentication(),
    PS.getPostById);



export default postRouter