"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleType = exports.GenderType = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
var GenderType;
(function (GenderType) {
    GenderType["male"] = "male";
    GenderType["female"] = "female";
})(GenderType || (exports.GenderType = GenderType = {}));
var RoleType;
(function (RoleType) {
    RoleType["user"] = "user";
    RoleType["admin"] = "admin";
})(RoleType || (exports.RoleType = RoleType = {}));
const userSchema = new mongoose_1.default.Schema({
    fName: { type: String, required: true, minLength: 2, maxLength: 15, trim: true },
    lName: { type: String, required: true, minLength: 2, maxLength: 15, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    age: { type: Number, min: 18, max: 65, required: true },
    phone: { type: String },
    address: { type: String },
    gender: { type: String, enum: GenderType, required: true },
    role: { type: String, enum: RoleType, default: RoleType.user },
    confirmed: { type: Boolean },
    otp: { type: String },
}, {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
});
userSchema.virtual("userName").set(function (value) {
    const [fName, lName] = value.split(" ");
    this.set({ fName, lName });
}).get(function () {
    return this.fName + " " + this.lName;
});
const userModel = mongoose_1.default.models.User || mongoose_1.default.model("User", userSchema);
exports.default = userModel;
