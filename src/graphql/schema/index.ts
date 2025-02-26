import { mergeTypeDefs } from "@graphql-tools/merge"
import { userSchema } from "./user"

/**
 * use graphql-tools/merge package to allow for seperate schemas and merging
 */
export const mergedGQLSchema = mergeTypeDefs([
	userSchema
])