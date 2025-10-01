import mongoose from "mongoose"
import z from "zod"


export const generalRules = {
    id: z.string().refine((value) => {
        return mongoose.Types.ObjectId.isValid(value)
    }, { message: "Invalid user id" }),
    email: z.email(),
    password: z.string(),
    otp: z.string(),
    file: z.object({
        fieldname: z.string(),
        originalname: z.string(),
        encoding: z.string(),
        mimetype: z.string(),
        buffer: z.instanceof(Buffer).optional(),
        path: z.string().optional(),
        size: z.number(),
    })
}





