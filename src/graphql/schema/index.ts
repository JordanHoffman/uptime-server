import { mergeTypeDefs } from "@graphql-tools/merge"
import { userSchema } from "./user"
import { notificationSchema } from "./notification"

/**
 * use graphql-tools/merge package to allow for seperate schemas and merging
 */
export const mergedGQLSchema = mergeTypeDefs([
	userSchema,
	notificationSchema
])