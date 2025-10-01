"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postSchema = exports.availabilityEnum = exports.allowCommentEnum = void 0;
const mongoose_1 = require("mongoose");
var allowCommentEnum;
(function (allowCommentEnum) {
    allowCommentEnum["allow"] = "allow";
    allowCommentEnum["deny"] = "deny";
})(allowCommentEnum || (exports.allowCommentEnum = allowCommentEnum = {}));
var availabilityEnum;
(function (availabilityEnum) {
    availabilityEnum["public"] = "public";
    availabilityEnum["private"] = "private";
    availabilityEnum["friends"] = "friends";
})(availabilityEnum || (exports.availabilityEnum = availabilityEnum = {}));
exports.postSchema = new mongoose_1.Schema({
    content: { type: String, minLength: 5, maxLength: 10000, required: function () { return this.attachments?.length === 0; } },
    attachments: [String],
    assetFolderId: String,
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    tags: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    likes: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    allowComment: { type: String, enum: allowCommentEnum, default: allowCommentEnum.allow },
    availability: { type: String, enum: availabilityEnum, default: availabilityEnum.public },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    restoredAt: { type: Date },
    restoredBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true
    },
    toObject: {
        virtuals: true
    },
    strictQuery: true
});
exports.postSchema.pre(["findOne", "find"], function (next) {
    const query = this.getQuery();
    const { paranoid, ...rest } = query;
    if (paranoid === false) {
        this.setQuery({ ...rest });
    }
    else {
        this.setQuery({ ...rest, deletedAt: { $exists: false } });
    }
    next();
});
const postModel = mongoose_1.models.Post || (0, mongoose_1.model)("Post", exports.postSchema);
exports.default = postModel;
