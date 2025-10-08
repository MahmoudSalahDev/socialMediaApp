"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentSchema = exports.onModelEnum = void 0;
const mongoose_1 = require("mongoose");
var onModelEnum;
(function (onModelEnum) {
    onModelEnum["Post"] = "Post";
    onModelEnum["Comment"] = "Comment";
})(onModelEnum || (exports.onModelEnum = onModelEnum = {}));
exports.commentSchema = new mongoose_1.Schema({
    content: { type: String, minLength: 5, maxLength: 10000, required: function () { return this.attachments?.length === 0; } },
    attachments: [String],
    assetFolderId: String,
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    refId: { type: mongoose_1.Schema.Types.ObjectId, refPath: "onModel", required: true },
    onModel: { type: String, enum: onModelEnum, required: true },
    tags: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    likes: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }],
    deletedAt: { type: Date },
    deletedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    restoredAt: { type: Date },
    restoredBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
}, {
    timestamps: true,
    strictQuery: true,
    toJSON: {
        virtuals: true
    },
    toObject: {
        virtuals: true
    },
});
exports.commentSchema.pre(["findOne", "find"], function (next) {
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
exports.commentSchema.virtual("replies", {
    ref: "Comment",
    localField: "_id",
    foreignField: "commentId"
});
const commentModel = mongoose_1.models.Comment || (0, mongoose_1.model)("Comment", exports.commentSchema);
exports.default = commentModel;
