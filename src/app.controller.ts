import { resolve } from "path"
import { config } from 'dotenv'
config({ path: resolve("./config/.env") })
import express, { NextFunction, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { error } from "console"
import { AppError } from "./utils/classError"
import userRouter from "./modules/users/user.controller"
import { connectionDB } from "./DB/connectionDB"
import { UserRepository } from "./DB/repositories/user.repository"
import userModel from "./DB/model/user.model"
import { createGetFilePreSignedUrl, deleteFile, deleteFiles, getFile, listFiles } from "./utils/s3.config"
import { pipeline } from "node:stream"
import { promisify } from "node:util"
import { ListObjectsV2CommandOutput } from "@aws-sdk/client-s3"
import postRouter from "./modules/posts/post.controller"

const writePipeLine = promisify(pipeline)
const app: express.Application = express()

const port: string | number = process.env.PORT || 5000

const limiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 100,
    message: {
        error: "Game Over......"
    },
    statusCode: 429,
    legacyHeaders: false
})

const bootstrap = async () => {
    app.use(express.json())
    app.use(cors())
    app.use(helmet())
    app.use(limiter)








    app.get('/', (req: Request, res: Response) => res.status(200).json({ message: 'Hello World!' }))


    // app.get("/upload", async (req: Request, res: Response, next: NextFunction) => {
    //     let result = await listFiles({
    //         path: "users/68cbe97aedea8653aa54552a"
    //     })
    //     if (!result?.Contents) {
    //         throw new AppError("Not Found!!!" , 404)
    //     }
    //     result = result?.Contents?.map((item) => item.Key) as unknown as ListObjectsV2CommandOutput

    //     await deleteFiles({
    //         urls:result as unknown as string[],
    //         Quiet:true
    //     })
    //     return res.status(200).json({ message: "success", result })
    // })

    // app.get("/upload/delete", async (req: Request, res: Response, next: NextFunction) => {
    //     const result = await deleteFiles({
    //         urls:[
    //             "socialMediaApp/users/68cbe97aedea8653aa54552a/cd2da9e2-ea8c-4a63-b7d0-a54def5348cd_one.png",
    //             "socialMediaApp/users/undefined/c8e346a1-c0c9-aa4e-90f3-e0a33a35cd05_dns.PNG",
    //         ],
    //         Quiet:true
    //     })
    //     return res.status(200).json({ message: "success", result })
    // })


    // app.get("/upload/delete/*path", async (req: Request, res: Response, next: NextFunction) => {
    //     const { path } = req.params as unknown as { path: string[] }
    //     const Key = path.join("/")

    //     const result = await deleteFile({
    //         Key,
    //     })
    //     return res.status(200).json({ message: "success", result })
    // })

    // app.get("/upload/pre-signed/*path", async (req: Request, res: Response, next: NextFunction) => {
    //     const { path } = req.params as unknown as { path: string[] }
    //     const { downloadName } = req.query as { downloadName: string }
    //     const Key = path.join("/")

    //     const url = await createGetFilePreSignedUrl({
    //         Key,
    //         downloadName: downloadName ? downloadName : undefined
    //     })
    //     return res.status(200).json({ message: "success", url })
    // })


    // app.get("/upload/*path", async (req: Request, res: Response, next: NextFunction) => {
    //     const { path } = req.params as unknown as { path: string[] }
    //     const { downloadName } = req.query as { downloadName: string }
    //     const Key = path.join("/")

    //     const result = await getFile({
    //         Key
    //     })
    //     const stream = result.Body as NodeJS.ReadableStream
    //     res.setHeader("Content-Type", result?.ContentType!)
    //     if (downloadName) {
    //         res.setHeader("Content-Disposition", `attachment; filename="${downloadName || Key.split("/").pop()}"`)
    //     }
    //     await writePipeLine(stream, res)
    // })




    app.use("/users", userRouter)
    app.use("/posts", postRouter)




    await connectionDB()

    app.use("{/*demo}", (req: Request, res: Response) => {
        throw new AppError(`Invalid URL ${req.originalUrl}`, 404)
    })


    app.use((err: AppError, req: Request, res: Response, next: express.NextFunction) => {
        return res
            .status(err.statusCode as unknown as number || 500)
            .json({ message: err.message, stack: err.stack })
    })


    app.listen(port, () => console.log(`Example app listening on port ${port}!`))
}


export default bootstrap