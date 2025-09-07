import z from "zod"
import { GenderType } from "../../DB/model/user.model";



const passRegex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,}$/

export const signUpSchema = {
    body: z.object({
        userName: z.string().min(2).max(15).trim(),
        email: z.email(),
        password: z.string(),
        cPassword: z.string(),
        age: z.number().min(18).max(65),
        address: z.string(),
        phone: z.string(),
        gender: z.enum([GenderType.male,GenderType.female]),
    }).required().superRefine((data, ctx) => {
        if (data.password !== data.cPassword) {
            ctx.addIssue({code: "custom",path:["cPassword"],message:"password and cPassword do not match!!"});
        }
    })
}



export const confirmEmailSchema = {
    body: z.object({
        email: z.email(),
        otp:z.string().regex(/^\d{6}$/).trim()
    }).required()
}

export const signInSchema = {
    body: z.object({
        email: z.email(),
        password: z.string(),
    }).required()
}



export type signUpSchemaType = z.infer<typeof signUpSchema.body>
export type signInSchemaType = z.infer<typeof signInSchema.body>
export type confirmEmailSchemaType = z.infer<typeof confirmEmailSchema.body>