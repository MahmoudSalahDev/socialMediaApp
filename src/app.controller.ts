import { resolve } from "path"
import { config } from 'dotenv'
config({ path: resolve("./config/.env") })
import express, { NextFunction, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { AppError } from "./utils/classError"
import userRouter from "./modules/users/user.controller"
import { connectionDB } from "./DB/connectionDB"
import { pipeline } from "node:stream"
import { promisify } from "node:util"
import postRouter from "./modules/posts/post.controller"
import { initializationIo } from "./modules/geteway/gateway"
import { getFile } from "./utils/s3.config"
import chatRouter from "./modules/chat/chat.controller"

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

    app.use("/users", userRouter)
    app.use("/posts", postRouter)
    app.use("/chat", chatRouter)


    app.get("/upload/*path", async (req: Request, res: Response, next: NextFunction) => {
        const { path } = req.params as unknown as { path: string[] }
        const { downloadName } = req.query as { downloadName: string }
        const Key = path.join("/")
        const result = await getFile({
            Key
        })
        const stream = result.Body as NodeJS.ReadableStream
        res.set("cross-origin-resource-policy","cross-origin")
        res.setHeader("Content-Type", result?.ContentType!)
        if (downloadName) {
            res.setHeader("Content-Disposition", `attachment; filename="${downloadName || Key.split("/").pop()}"`)
        }
        await writePipeLine(stream, res)
    })

    await connectionDB()

    app.use("{/*demo}", (req: Request, res: Response) => {
        throw new AppError(`Invalid URL ${req.originalUrl}`, 404)
    })


    app.use((err: AppError, req: Request, res: Response, next: express.NextFunction) => {
        return res
            .status(err.statusCode as unknown as number || 500)
            .json({ message: err.message, stack: err.stack })
    })


    const server = app.listen(port, () => console.log(`Example app listening on port ${port}!`))


    initializationIo(server)

}


export default bootstrap