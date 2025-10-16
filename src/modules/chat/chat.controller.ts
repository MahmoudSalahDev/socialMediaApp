import { Router } from "express"
import { Authentication } from "../../middleware/authentication"
import { ChatService } from "./chat.service"
import { fileValidation, multerCloud } from "../../middleware/multer.cloud"
import { Validation } from "../../middleware/validation"
import { createGroupChatSchema } from "./chat.validation"



const chatRouter = Router({ mergeParams: true })

const CS= new ChatService()



chatRouter.get("/",Authentication(),CS.getChat)
chatRouter.get("/group/:groupId",Authentication(),CS.getGroupChat)
chatRouter.post("/group",Authentication(),
multerCloud({ fileTypes: fileValidation.image  }).single("attachment"),
// Validation(createGroupChatSchema),
CS.createGroupChat)




export default chatRouter