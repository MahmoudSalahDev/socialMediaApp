import { Router } from "express";
import CS from "./comment.service";
import { Validation } from "../../middleware/validation";
import * as CV from "./comment.validation";
import { Authentication } from "../../middleware/authentication";
import { fileValidation, multerCloud } from "../../middleware/multer.cloud";

const commentRouter = Router({ mergeParams: true })



commentRouter.post("/",
    Authentication(),
    multerCloud({ fileTypes: fileValidation.image }).array("attachments", 2),
    Validation(CV.createCommentSchema),
    CS.createComment)

commentRouter.delete(
    "/:commentId/freeze",
    Authentication(),
    CS.freezeComment
);

commentRouter.patch(
    "/:commentId/unfreeze",
    Authentication(),
    CS.unfreezeComment
);

commentRouter.delete(
    "/:commentId/hardDelete",
    Authentication(),
    CS.hardDeleteComment
);

commentRouter.patch(
    "/:commentId",
    Authentication(),
    multerCloud({ fileTypes: fileValidation.image }).array("attachments", 2),
    CS.updateComment
);
commentRouter.get("/:commentId/replies", Authentication(), CS.getCommentWithReplies);

commentRouter.get("/:commentId",
    Authentication(),
    CS.getCommentById);





export default commentRouter