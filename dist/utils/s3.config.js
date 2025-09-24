"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUploadFilePresignedUrl = exports.uploadFiles = exports.uploadLargeFile = exports.uploadFile = exports.s3Client = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const uuid_1 = require("uuid");
const multer_cloud_1 = require("../middleware/multer.cloud");
const fs_1 = require("fs");
const classError_1 = require("./classError");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const s3Client = () => {
    return new client_s3_1.S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
    });
};
exports.s3Client = s3Client;
const uploadFile = async ({ storeType = multer_cloud_1.storageEnum.cloud, Bucket = process.env.AWS_BUCKET_NAME, path = "general", ACL = "private", file }) => {
    const command = new client_s3_1.PutObjectCommand({
        Bucket,
        ACL,
        Key: `${process.env.APPLICATION_NAME}/${path}/${(0, uuid_1.v4)()}_${file.originalname}`,
        Body: storeType === multer_cloud_1.storageEnum.cloud ? file.buffer : (0, fs_1.createReadStream)(file.path),
        ContentType: file.mimetype
    });
    await (0, exports.s3Client)().send(command);
    if (!command.input.Key) {
        throw new classError_1.AppError("Failed to upload file to s3😵", 500);
    }
    return command.input.Key;
};
exports.uploadFile = uploadFile;
const uploadLargeFile = async ({ storeType = multer_cloud_1.storageEnum.cloud, Bucket = process.env.AWS_BUCKET_NAME, path = "general", ACL = "private", file }) => {
    const upload = new lib_storage_1.Upload({
        client: (0, exports.s3Client)(),
        params: {
            Bucket,
            ACL,
            Key: `${process.env.APPLICATION_NAME}/${path}/${(0, uuid_1.v4)()}_${file.originalname}`,
            Body: storeType === multer_cloud_1.storageEnum.cloud ? file.buffer : (0, fs_1.createReadStream)(file.path),
            ContentType: file.mimetype
        }
    });
    upload.on("httpUploadProgress", (progress) => {
        console.log(progress);
    });
    const { Key } = await upload.done();
    if (!Key) {
        throw new classError_1.AppError("Failed to upload file to s3😵", 500);
    }
    return Key;
};
exports.uploadLargeFile = uploadLargeFile;
const uploadFiles = async ({ storeType = multer_cloud_1.storageEnum.cloud, Bucket = process.env.AWS_BUCKET_NAME, path = "general", ACL = "private", files, useLarge = false }) => {
    let urls = [];
    if (useLarge == true) {
        urls = await Promise.all(files.map(file => (0, exports.uploadLargeFile)({ storeType, Bucket, path, ACL, file })));
    }
    else {
        urls = await Promise.all(files.map(file => (0, exports.uploadFile)({ storeType, Bucket, path, ACL, file })));
    }
    return urls;
};
exports.uploadFiles = uploadFiles;
const createUploadFilePresignedUrl = async ({ Bucket = process.env.APPLICATION_NAME, path = "general", originalname, ContentType, expiresIn = 60 * 60 }) => {
    const command = new client_s3_1.PutObjectCommand({
        Bucket,
        Key: `${process.env.APPLICATION_NAME}/${path}/${(0, uuid_1.v4)()}_${originalname}`,
        ContentType
    });
    const url = await (0, s3_request_presigner_1.getSignedUrl)((0, exports.s3Client)(), command, { expiresIn });
    return url;
};
exports.createUploadFilePresignedUrl = createUploadFilePresignedUrl;
