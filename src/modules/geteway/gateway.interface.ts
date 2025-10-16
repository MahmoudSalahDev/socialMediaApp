import { JwtPayload } from "jsonwebtoken";
import { HydratedDocument } from "mongoose";
import { Socket } from "socket.io";
import { IUser } from "../../DB/model/user.model";

export interface SocketWithUser extends Socket {
    user?: Partial<HydratedDocument<IUser>>,
    decoded?: JwtPayload
}