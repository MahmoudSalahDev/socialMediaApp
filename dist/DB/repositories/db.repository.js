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
    async findOne(filter, select, options) {
        return this.model.findOne(filter, select, options);
    }
    async find({ filter, select, options, }) {
        return this.model.find(filter, select, options);
    }
    async paginate({ filter, select, options, query, }) {
        let { page, limit } = query;
        if (page < 0) {
            page = 1;
        }
        page = page * 1 || 1;
        const skip = (page - 1) * limit;
        const finalOptions = {
            ...options,
            skip,
            limit
        };
        const count = await this.model.countDocuments({ deletedAt: { $exists: false } });
        const numberOfPages = Math.ceil(count / limit);
        const docs = await this.model.find(filter, select, finalOptions);
        return { docs, currentPage: page, count, numberOfPages };
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
    async deleteMany(filter) {
        return await this.model.deleteMany(filter);
    }
}
exports.DbRepository = DbRepository;
