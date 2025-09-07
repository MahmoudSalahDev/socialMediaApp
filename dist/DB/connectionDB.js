"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectionDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectionDB = async () => {
    mongoose_1.default.connect(process.env.DB_URL)
        .then(() => {
        console.log(`success to connect to DB ${process.env.DB_URL} 😁`);
    })
        .catch((error) => {
        console.log(`failed to connect to DB 😖`, error);
    });
};
exports.connectionDB = connectionDB;
