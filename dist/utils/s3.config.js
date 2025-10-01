"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listFiles = exports.deleteFiles = exports.deleteFile = exports.createGetFilePreSignedUrl = exports.getFile = exports.createUploadFilePresignedUrl = exports.uploadFiles = exports.uploadLargeFile = exports.uploadFile = exports.s3Client = void 0;
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
    const Key = `${process.env.APPLICATION_NAME}/${path}/${(0, uuid_1.v4)()}_${originalname}`;
    const command = new client_s3_1.PutObjectCommand({
        Bucket,
        Key,
        ContentType
    });
    const url = await (0, s3_request_presigner_1.getSignedUrl)((0, exports.s3Client)(), command, { expiresIn });
    return { url, Key };
};
exports.createUploadFilePresignedUrl = createUploadFilePresignedUrl;
const getFile = async ({ Bucket = process.env.AWS_BUCKET_NAME, Key }) => {
    const command = new client_s3_1.GetObjectCommand({
        Bucket,
        Key
    });
    return await (0, exports.s3Client)().send(command);
};
exports.getFile = getFile;
const createGetFilePreSignedUrl = async ({ Bucket = process.env.AWS_BUCKET_NAME, Key, expiresIn = 60, downloadName }) => {
    const command = new client_s3_1.GetObjectCommand({
        Bucket,
        Key,
        ResponseContentDisposition: downloadName ? `attachment; filename="${downloadName}"` : undefined
    });
    const url = await (0, s3_request_presigner_1.getSignedUrl)((0, exports.s3Client)(), command, { expiresIn });
    return url;
};
exports.createGetFilePreSignedUrl = createGetFilePreSignedUrl;
const deleteFile = async ({ Bucket = process.env.AWS_BUCKET_NAME, Key, }) => {
    const command = new client_s3_1.DeleteObjectCommand({
        Bucket,
        Key,
    });
    return await (0, exports.s3Client)().send(command);
};
exports.deleteFile = deleteFile;
const deleteFiles = async ({ Bucket = process.env.AWS_BUCKET_NAME, urls, Quiet = false }) => {
    const command = new client_s3_1.DeleteObjectsCommand({
        Bucket,
        Delete: {
            Objects: urls.map(url => ({ Key: url })),
            Quiet
        },
    });
    return await (0, exports.s3Client)().send(command);
};
exports.deleteFiles = deleteFiles;
const listFiles = async ({ Bucket = process.env.AWS_BUCKET_NAME, path }) => {
    const command = new client_s3_1.ListObjectsV2Command({
        Bucket,
        Prefix: `${process.env.APPLICATION_NAME}/${path}/`,
    });
    return await (0, exports.s3Client)().send(command);
};
exports.listFiles = listFiles;
