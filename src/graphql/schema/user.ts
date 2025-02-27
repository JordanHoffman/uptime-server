import { buildSchema } from "graphql"

/**
 * Notice the "input" type used here. This is specifically for grqaphql object types that can be passed as args. They're for objects that are sent from the client to the server. They need the "input" rather than the "type" qualifier. Otherwise they are just output types (meant to be from server/db to client) and cant be passed as args. This is only for objects. Simple scalar types and others can be passed as args.
 */
export const userSchema = buildSchema(`#graphql
	input Auth {
		username: String
		email: String
		password: String
		socialId: String
		type: String
	}

	type User {
		id: Int
		username: String
		email: String
		createdAt: String
		googleId: String
		facebookId: String
	}

	input NotificationResult {
		id: ID!
		userid: Int!
		groupName: String!
		emails: String!
	}

	type AuthResponse {
		user: User!
		notifications: [NotificationResult!]!
	}

	type AuthLogoutResponse {
		message: String
	}

	#meant for auth checking for pg navigation
	type CurrentUserResponse {
		user: User
		notifications: [NotificationResult]
	}

	type Query {
		checkCurrentUser: CurrentUserResponse
	}

	type Mutation {
		loginUser(username: String!, password: String!): AuthResponse!
		registerUser(user: Auth!): AuthResponse!
		authSocialUser(user: Auth!): AuthResponse!
		logout: AuthLogoutResponse
	}
`)
