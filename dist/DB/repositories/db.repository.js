"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbRepository = void 0;
class DbRepository {
    model;
    constructor(model) {
        this.model = model;
    }
    async create(data) {
        return this.model.create(data);
    }
    async findOne(filter, select) {
        return this.model.findOne(filter, select);
    }
    async find(filter, select, options) {
        return this.model.find(filter, select, options);
    }
    async updateOne(filter, update) {
        return await this.model.updateOne(filter, update);
    }
    async findOneAndUpdate(filter, update, options = { new: true }) {
        return this.model.findOneAndUpdate(filter, update, options);
    }
    async deleteOne(filter) {
        return await this.model.deleteOne(filter);
    }
}
exports.DbRepository = DbRepository;
