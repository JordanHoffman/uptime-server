import { buildSchema } from "graphql";

export const monitorSchema = buildSchema(`#graphql
	input Monitor {
    id: Int
    name: String!
    userId: Int!
    active: Boolean
    status: Int!
    frequency: Int!
    url: String!
    method: String
    type: String!
    alertThreshold: Int!
    body: String
    headers: String
    httpAuthMethod: String
    basicAuthUser: String
    basicAuthPass: String
    bearerToken: String
    timeout: Int
    redirects: Int
    responseTime: String
    statusCode: String
    contentType: String
    connection: String
    port: Int
    notificationId: Int!
  }
`)

// type HeartBeatResponse {
// 	id: ID
// 	monitorId: Int
// 	status: Int
// 	code: Int
// 	message: String
// 	timestamp: String
// 	reqHeaders: String
// 	resHeaders: String
// 	reqBody: String
// 	resBody: String
// 	responseTime: Int
// 	connection: String
// }