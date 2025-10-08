import { DeleteResult, HydratedDocument, Model, ProjectionType, QueryOptions, RootFilterQuery, UpdateQuery, UpdateWriteOpResult } from "mongoose";
import { AppError } from "../../utils/classError";

export abstract class DbRepository<TDocument> {
    constructor(protected readonly model: Model<TDocument>) { }



    async create(data: Partial<TDocument>): Promise<HydratedDocument<TDocument>> {
        return this.model.create(data)
    }

    async findOne(
        filter: RootFilterQuery<TDocument>,
        select?: ProjectionType<TDocument>,
        options?: QueryOptions<TDocument>
    ): Promise<HydratedDocument<TDocument> | null> {
        return this.model.findOne(filter, select,options)
    }

    async find(
        {
            filter,
            select,
            options,
        }: {
            filter: RootFilterQuery<TDocument>,
            select?: ProjectionType<TDocument>,
            options?: QueryOptions<TDocument>
        }
    ): Promise<HydratedDocument<TDocument>[]> {
        return this.model.find(filter, select, options)
    }

    async paginate(
        {
            filter,
            select,
            options,
            query,
        }: {
            filter: RootFilterQuery<TDocument>,
            select?: ProjectionType<TDocument>,
            options?: QueryOptions<TDocument>,
            query: { page: number, limit: number }
        }
    ) {
        let { page, limit } = query
        if (page < 0) { page = 1 }
        page = page * 1 || 1
        const skip = (page - 1) * limit

        const finalOptions = {
            ...options,
            skip,
            limit
        }

        const count = await this.model.countDocuments({deletedAt:{$exists:false}})
        const numberOfPages = Math.ceil(count/limit)
        const docs = await this.model.find(filter, select, finalOptions)
        return {docs , currentPage: page , count,numberOfPages}
    }

    async updateOne(filter: RootFilterQuery<TDocument>, update: UpdateQuery<TDocument>): Promise<UpdateWriteOpResult> {
        return await this.model.updateOne(filter, update)
    }

    async findOneAndUpdate(
        filter: RootFilterQuery<TDocument>,
        update: UpdateQuery<TDocument>,
        options: QueryOptions<TDocument> | null = { new: true }
    ): Promise<HydratedDocument<TDocument> | null> {
        return this.model.findOneAndUpdate(filter, update, options);
    }

    async deleteOne(filter: RootFilterQuery<TDocument>): Promise<DeleteResult> {
        return await this.model.deleteOne(filter)
    }

    async deleteMany(filter: RootFilterQuery<TDocument>): Promise<DeleteResult> {
    return await this.model.deleteMany(filter);
}


}