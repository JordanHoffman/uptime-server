import { INotificationDocument } from "./notification.interface";

//Creating a global override the Request variabe from Express to add currentUser to that variable
declare global {
	namespace Express {
		interface Request {
			currentUser?: IAuthPayload;
		}
	}
}

export interface IAuthPayload {
	id: number;
	username: string;
	email: string;
	iat?: number; //timestamp generated by token
}

export interface IUserDocument {
	id?: number
	username?: string
	googleId?: string
	facebookId?: string
	email?: string
	password?: string
	createdAt?: Date
	comparePassword(password: string, hashedPassword: string): Promise<boolean>
	hashPassword(password: string): Promise<string>
}

export interface IUserResponse {
	user: IUserDocument;
	notifications: INotificationDocument[]
}