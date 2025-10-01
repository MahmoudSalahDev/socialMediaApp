"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderType = exports.RoleType = exports.GenderType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
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
var ProviderType;
(function (ProviderType) {
    ProviderType["system"] = "system";
    ProviderType["google"] = "google";
})(ProviderType || (exports.ProviderType = ProviderType = {}));
const userSchema = new mongoose_1.default.Schema({
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
    profileImage: { type: String },
    tempProfileImage: { type: String },
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
    deletedBy: { type: mongoose_1.Types.ObjectId, ref: "User" },
    restoredAt: { type: Date },
    restoredBy: { type: mongoose_1.Types.ObjectId, ref: "User" },
    friends: { type: mongoose_1.Types.ObjectId, ref: "User" },
    is2FAEnabled: { type: Boolean, default: false },
    tempOtp: { type: String },
    otpExpiry: { type: Date },
}, {
    timestamps: true,
    strictQuery: true,
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
