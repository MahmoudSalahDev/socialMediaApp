import z from "zod"
import { GenderType } from "../../DB/model/user.model";
import { Types } from "mongoose";
import { generalRules } from "../../utils/generalRules";

export enum FlagType {
    all = "all",
    current = "current",
}

export const getOneUserSchema = z.strictObject({
    id: generalRules.id
}).required()

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
        gender: z.enum([GenderType.male, GenderType.female]),
    }).required().superRefine((data, ctx) => {
        if (data.password !== data.cPassword) {
            ctx.addIssue({ code: "custom", path: ["cPassword"], message: "password and cPassword do not match!!" });
        }
    })
}





export const confirmEmailSchema = {
    body: z.object({
        email: z.email(),
        otp: z.string().regex(/^\d{6}$/).trim()
    }).required()
}

export const freezeAccountSchema = {
    params: z.strictObject({
        userId: z.string().optional(),
    }).required().refine((value) => {
        return value?.userId ? Types.ObjectId.isValid(value.userId) : true
    }, {
        message: "userId is required",
        path: ["userId"]
    })
}
export const unfreezeAccountSchema = {
    params: z.strictObject({
        userId: z.string(),
    }).required().refine((value) => {
        return value?.userId ? Types.ObjectId.isValid(value.userId) : true
    }, {
        message: "userId is required",
        path: ["userId"]
    })
}

export const resetPasswordSchema = {
    body: confirmEmailSchema.body.extend({
        password: z.string(),
        cPassword: z.string(),
    }).required().superRefine((data, ctx) => {
        if (data.password !== data.cPassword) {
            ctx.addIssue({ code: "custom", path: ["cPassword"], message: "password and cPassword do not match!!" });
        }
    })
}

export const loginWithGmailSchema = {
    body: z.object({
        idToken: z.string(),
    }).required()
}

export const signInSchema = {
    body: z.object({
        email: z.email(),
        password: z.string(),
    }).required()
}
export const forgetPasswordSchema = {
    body: z.object({
        email: z.email(),
    }).required()
}


export const logOutSchema = {
    body: z.object({
        flag: z.enum(FlagType),
    }).required()
}

export const updatePasswordSchema = {
    body: z.object({
        oldPassword: z.string(),
        newPassword: z.string(),
        cPassword: z.string(),
    })
        .required()
        .superRefine((data, ctx) => {
            if (data.newPassword !== data.cPassword) {
                ctx.addIssue({
                    code: "custom",
                    path: ["cPassword"],
                    message: "newPassword and cPassword do not match!!",
                });
            }
        }),
};


export const updateProfileSchema = {
    body: z.object({
        userName: z.string().min(2).max(30).optional(),
        phone: z.string().optional(),
        gender: z.enum([GenderType.male, GenderType.female]).optional(),
        age: z.number().min(18).max(65).optional(),
    }).refine((data) => {
        return data.userName || data.phone || data.gender || data.age;
    }, {
        message: "You must provide at least one field to update",
    })
};

export const updateEmailSchema = {
    body: z.object({
        email: z.email(),
    }).required()
};



export type signUpSchemaType = z.infer<typeof signUpSchema.body>
export type signInSchemaType = z.infer<typeof signInSchema.body>
export type confirmEmailSchemaType = z.infer<typeof confirmEmailSchema.body>
export type logOutSchemaType = z.infer<typeof logOutSchema.body>
export type loginWithGmailSchemaType = z.infer<typeof loginWithGmailSchema.body>
export type forgetPasswordSchemaType = z.infer<typeof forgetPasswordSchema.body>
export type resetPasswordSchemaType = z.infer<typeof resetPasswordSchema.body>
export type freezeAccountSchemaType = z.infer<typeof freezeAccountSchema.params>

export type updatePasswordSchemaType = z.infer<typeof updatePasswordSchema.body>

export type updateProfileSchemaType = z.infer<typeof updateProfileSchema.body>;