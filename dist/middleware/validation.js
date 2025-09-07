"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validation = void 0;
const classError_1 = require("../utils/classError");
const Validation = (schema) => {
    return (req, res, next) => {
        const ValidationErrors = [];
        for (const key of Object.keys(schema)) {
            if (!schema[key])
                continue;
            const result = schema[key].safeParse(req[key]);
            if (!result.success) {
                ValidationErrors.push(result.error);
            }
        }
        if (ValidationErrors.length) {
            throw new classError_1.AppError(JSON.parse(ValidationErrors), 400);
        }
        next();
    };
};
exports.Validation = Validation;
