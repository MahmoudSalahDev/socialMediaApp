"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationGraphQL = exports.Validation = void 0;
const classError_1 = require("../utils/classError");
const graphql_1 = require("graphql");
const Validation = (schema) => {
    return (req, res, next) => {
        const ValidationErrors = [];
        for (const key of Object.keys(schema)) {
            if (!schema[key])
                continue;
            if (req?.file) {
                req.body.attachments = req.file;
            }
            if (req?.files) {
                req.body.attachments = req.files;
            }
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
const ValidationGraphQL = async (schema, args) => {
    const ValidationErrors = [];
    const result = schema.safeParse(args);
    if (!result.success) {
        ValidationErrors.push(result.error);
    }
    if (ValidationErrors.length) {
        throw new graphql_1.GraphQLError("validation errors", {
            extensions: {
                code: "validation errors",
                http: { status: 400 },
                errors: JSON.parse(ValidationErrors)
            }
        });
    }
};
exports.ValidationGraphQL = ValidationGraphQL;
