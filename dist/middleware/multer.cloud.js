"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.multerCloud = exports.storageEnum = exports.fileValidation = void 0;
const multer_1 = __importDefault(require("multer"));
const classError_1 = require("../utils/classError");
const node_os_1 = __importDefault(require("node:os"));
const uuid_1 = require("uuid");
exports.fileValidation = {
    image: ["image/png", "image/jpg", "image/jpeg"],
    video: ["video/mp4"],
    audio: ["audio/mpeg", "audio/mp3"],
    file: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
};
var storageEnum;
(function (storageEnum) {
    storageEnum["disk"] = "disk";
    storageEnum["cloud"] = "cloud";
})(storageEnum || (exports.storageEnum = storageEnum = {}));
const multerCloud = ({ fileTypes = exports.fileValidation.image, storeType = storageEnum.cloud, maxSize = 5 }) => {
    const storage = storeType === storageEnum.cloud ? multer_1.default.memoryStorage() : multer_1.default.diskStorage({
        destination: node_os_1.default.tmpdir(),
        filename(req, file, cb) {
            cb(null, `${(0, uuid_1.v4)()} ${file.originalname}`);
        }
    });
    const fileFilter = (req, file, cb) => {
        if (fileTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            return cb(new classError_1.AppError("Invalid file type", 400));
        }
    };
    const upload = (0, multer_1.default)({ storage, limits: { fileSize: 1024 * 1024 * maxSize }, fileFilter });
    return upload;
};
exports.multerCloud = multerCloud;
