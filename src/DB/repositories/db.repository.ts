import { HydratedDocument, Model, ProjectionType, RootFilterQuery, UpdateQuery, UpdateWriteOpResult } from "mongoose";
import { AppError } from "../../utils/classError";

export abstract class DbRepository<TDocument> {
    constructor(protected readonly model: Model<TDocument>) { }



    async create(data: Partial<TDocument>): Promise<HydratedDocument<TDocument>> {
        return this.model.create(data)
    }

    async findOne(filter: RootFilterQuery<TDocument>, select?: ProjectionType<TDocument>): Promise<HydratedDocument<TDocument> | null> {
        return this.model.findOne(filter)
    }

    async updateOne(filter: RootFilterQuery<TDocument>, update: UpdateQuery<TDocument>): Promise<UpdateWriteOpResult> {
        return await this.model.updateOne(filter , update)
    }


}