"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Authorization = void 0;
const classError_1 = require("../utils/classError");
const Authorization = ({ accessRoles = [] }) => {
    return (req, res, next) => {
        if (!accessRoles.includes(req?.user?.role)) {
            throw new classError_1.AppError("Unauthorized!!😡", 401);
        }
        next();
    };
};
exports.Authorization = Authorization;
