import mongoose, { Types } from "mongoose";


export enum GenderType {
    male = "male",
    female = "female"
}

export enum RoleType {
    user = "user",
    admin = "admin"
}

export enum ProviderType {
    system = "system",
    google = "google"
}

export interface IUser {
    _id: Types.ObjectId,
    fName: string,
    lName: string,
    userName?: string,
    email: string,
    password: string,
    age: number,
    phone?: string,
    address?: string,
    gender: GenderType,
    role?: RoleType,
    confirmed?: boolean,
    otp?: string,
    changeCredentials?: Date,
    image?: string,
    provider?: ProviderType,
    createdAt: Date,
    updatedAt: Date,
    deletedAt?:Date
}


const userSchema = new mongoose.Schema<IUser>({
    fName: { type: String, required: true, minLength: 2, maxLength: 15, trim: true },
    lName: { type: String, required: true, minLength: 2, maxLength: 15, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: {
        type: String, required: function () {
            return this.provider === ProviderType.google ? false : true;
        }
    },
    age: {
        type: Number, min: 18, max: 65, required: function () {
            return this.provider === ProviderType.google ? false : true;
        }
    },
    phone: { type: String },
    image: { type: String },
    address: { type: String },
    gender: {
        type: String, enum: GenderType, required: function () {
            return this.provider === ProviderType.google ? false : true;
        }
    },
    role: { type: String, enum: RoleType, default: RoleType.user },
    provider: { type: String, enum: ProviderType, default: ProviderType.system },
    confirmed: { type: Boolean },
    otp: { type: String },
    changeCredentials: { type: Date },
    deletedAt: { type: Date },
}, {
    timestamps: true,
    strictQuery:true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
})


userSchema.virtual("userName").set(function (value) {
    const [fName, lName] = value.split(" ")
    this.set({ fName, lName })
}).get(function () {
    return this.fName + " " + this.lName
})


userSchema.pre(["findOne","updateOne"],async function(){
    console.log("----------------------------------pre deleteone hook-------------------");
    console.log({this:this , query:this.getQuery()});
    const query = this.getQuery()
    const {paranoid , ...rest} = query
    if(paranoid==false){
        this.setQuery({...rest}) 
    }else{
        this.setQuery({...rest , deletedAt:{$exists:false}}) 
    }



})



const userModel = mongoose.models.User || mongoose.model<IUser>("User", userSchema)

export default userModel