import { INotificationDocument } from "@app/interfaces/notification.interface";
import { IUserDocument, IUserResponse } from "@app/interfaces/user.interface";
import { AppContext } from "@app/interfaces/monitor.interface";
import { createNotificationGroup, getAllNotificationGroups } from "@app/services/notification.service";
import { createNewUser, getUserByProp, getUserBySocialId, getUserByUsernameOrEmail } from "@app/services/user.service";
import { GraphQLError } from "graphql";
import { toLower, upperFirst } from "lodash";
import { sign } from 'jsonwebtoken'
import { JWT_TOKEN } from "@app/server/config";
import { type Request } from "express";
import { authenticateGraphQLRoute, isEmail } from "@app/utils/utils";
import { UserModel } from "@app/models/user.model";
import { UserLoginRules, UserRegisterationRules } from "@app/validations";


export const UserResolver = {
	Query: {
		async checkCurrentUser(_: undefined, __:undefined, contextValue: AppContext) {
			const { req } = contextValue
			authenticateGraphQLRoute(req)
			const notifications = await getAllNotificationGroups(req.currentUser!.id)
			return {
				user: {
					id: req.currentUser?.id,
					username: req.currentUser?.username,
					email: req.currentUser?.email,
					createdAt: new Date() //not correct, fix if truly needed
				},
				notifications
			}
		}
	},

	Mutation: {
		async loginUser(_parent: undefined, args: { username: string, password: string}, contextValue: AppContext) {
			const { req } = contextValue
			const { username, password } = args
			//validation
			await UserLoginRules.validate({ username, password}, { abortEarly: false })
			
			const isValidEmail = isEmail(username)
			const type = !isValidEmail ? 'username' : 'email'
			const existingUser: IUserDocument | undefined = await getUserByProp(username, type)
			if (!existingUser) {
				throw new GraphQLError('invalid credentials')
			}
			const passwordMatch: boolean = await UserModel.prototype.comparePassword(password, existingUser.password!)
			if (!passwordMatch) {
				throw new GraphQLError('Invalid credentials')
			}
			const response: IUserResponse = await userReturnValue(req, existingUser, 'login')
			return response
		},

		/** only for email/password signup, not social auth */
		async registerUser(_parent: undefined, args: { user: IUserDocument }, contextValue: AppContext) {
			//we set up context within server.js so that we can now access req/res within graphql!
			const { req } = contextValue
			const { user } = args
			//validation
			await UserRegisterationRules.validate(user, { abortEarly: false })

			const { username, email, password } = user
			const checkIfUserExist: IUserDocument | undefined = await getUserByUsernameOrEmail(username!, email!)
			if (checkIfUserExist) {
				throw new GraphQLError('Invalid credentials. Email or username')
			}
			const authData: IUserDocument = {
				username: upperFirst(username),
				email: toLower(email),
				password
			} as IUserDocument
			const result: IUserDocument | undefined = await createNewUser(authData)
			const response: IUserResponse = await userReturnValue(req, result, 'register')
			return response
		},
		/** only for google/facebook login */
		async authSocialUser(_parent: undefined, args: { user: IUserDocument }, contextValue: AppContext) {
			const { req } = contextValue
			const { user } = args
			//validation
			await UserRegisterationRules.validate(user, { abortEarly: false })

			const { username, email, socialId, type } = user
			const checkIfUserExist: IUserDocument | undefined = await getUserBySocialId(socialId!, email!, type!)
			if (checkIfUserExist) {
				const response: IUserResponse = await userReturnValue(req, checkIfUserExist, 'login')
				return response
			} else {
				const authData: IUserDocument = {
					username: upperFirst(username),
					email: toLower(email),
					...(type === 'facebook' && {
						facebookId: socialId
					}),
					...(type === 'google' && {
						googleId: socialId
					})
				} as IUserDocument
				const result: IUserDocument | undefined = await createNewUser(authData)
				const response: IUserResponse = await userReturnValue(req, result, 'register')
				return response
			}

		},
		async logout(_: undefined, __:undefined, contextValue: AppContext) {
			const { req } = contextValue
			req.session = null //destroy user session
			req.currentUser = undefined
			return null
		}
	},
	//backend will return createdAt as Data, but we want it to be a string. Use the field resolver to do that.
	User: {
		createdAt: (user: IUserDocument) => new Date(`${user.createdAt}`).toISOString()
	}
}

/**
 * Reusable final part for most previous login functions. JWT session is set here.
 */
async function userReturnValue(req: Request, result: IUserDocument, type: string): Promise<IUserResponse> {
	let notifications: INotificationDocument[] = []
	//registering
	if (type === 'register' && result && result.id && result.email) {
		const notification = await createNotificationGroup({
			userId: result.id,
			groupName: 'Default Contact Group',
			emails: JSON.stringify([result.email])
		})
		notifications.push(notification)
	}
	//regular login (not register)
	else if (type === 'login' && result && result.id && result.email) {
		notifications = await getAllNotificationGroups(result.id)
	}

	const userJwt: string = sign(
		{
			id: result.id,
			email: result.email,
			username: result.username
		},
		JWT_TOKEN
	)
	req.session = { jwt: userJwt, enableAutomaticRefresh: false }
	const user: IUserDocument = {
		id: result.id,
		email: result.email,
		username: result.username,
		createdAt: result.createdAt
	} as IUserDocument

	return {
		user,
		notifications
	}
}