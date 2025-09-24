import { resolve } from "path"
import { config } from 'dotenv'
config({ path: resolve("./config/.env") })
import express, { Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { error } from "console"
import { AppError } from "./utils/classError"
import userRouter from "./modules/users/user.controller"
import { connectionDB } from "./DB/connectionDB"
import { UserRepository } from "./DB/repositories/user.repository"
import userModel from "./DB/model/user.model"
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




    // async function test() {
    //     const _userModel = new UserRepository(userModel);
    //     const user =  await _userModel.findOne({fName:"mahmoud" , paranoid:false},{age:25})
    //     console.log(user);
        

    // }

    // test()


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