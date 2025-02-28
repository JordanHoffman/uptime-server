import { pubSub } from "@app/graphql/resolvers/monitor";
import { IMonitorDocument } from "@app/interfaces/monitor.interface";
import { IAuthPayload } from "@app/interfaces/user.interface";
import { JWT_TOKEN } from "@app/server/config";
import { getAllUsersActiveMonitors, getMonitorById, getUserActiveMonitors, startCreatedMonitors } from "@app/services/monitor.service";
import { Request } from "express";
import { GraphQLError } from "graphql";
import { verify } from "jsonwebtoken";
import { toLower } from "lodash";
import { startSingleJob } from "./jobs";

//gives us the timezone for each user
export const appTimeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone

export const isEmail = (email: string): boolean => {
  const regexExp =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/gi;
  return regexExp.test(email);
}

/**
 * Authenticates user access to protected routes 
 * @param req
 * @returns {void}
 */
export const authenticateGraphQLRoute = (req: Request): void => {
	if (!req.session?.jwt) {
		throw new GraphQLError('Please login again.')
	}
	try {
		const payload: IAuthPayload = verify(req.session?.jwt, JWT_TOKEN) as IAuthPayload
		req.currentUser = payload
	} catch (error) {
		throw new GraphQLError('Please login again.')
	}
}

/**
 * delays for specified number of seconds
 */
export const sleep = (ms: number): Promise<void> => {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * get random int between min and max
 */
export const getRandomInt = (min: number, max: number): number => {
	min = Math.ceil(min)
	max = Math.floor(max)
	return Math.floor(Math.random() * (max - min + 1)) + min
}


/**
 * When our server restarts, cron jobs don't automatically restart. Use this fx to restart all cron jobs for monitors that are active from all users.
 */
export const startMonitors = async (): Promise<void> => {
	const list: IMonitorDocument[] = await getAllUsersActiveMonitors()

	for (const monitor of list) {
		startCreatedMonitors(monitor, toLower(monitor.name), monitor.type)
		//create a delay between starting each monitor (I guess to prevent overload)
		await sleep(getRandomInt(300, 1000))
	}
}

export const resumeMonitors = async (monitorId: number): Promise<void> => {
	const monitor: IMonitorDocument = await getMonitorById(monitorId)
	startCreatedMonitors(monitor, toLower(monitor.name), monitor.type)
	await sleep(getRandomInt(300, 1000))
}

/**
 * A lot of confusing stuff happening. Websocket request doesn't have access to Express' req object. So we need to manually get cookie data from it. I think this is for when server restarts it can start up all subscriptions properly.
 */
export const enableAutoRefreshJob = (cookies: string): void => {
	const result: Record<string, string> = getCookies(cookies)
	const session: string = Buffer.from(result.session, 'base64').toString()
	const payload: IAuthPayload = verify(JSON.parse(session).jwt, JWT_TOKEN) as IAuthPayload
	const enableAutoRefresh: boolean = JSON.parse(session).enableAutomaticRefresh
	if (enableAutoRefresh) {
		startSingleJob(`${toLower(payload.username)}`, appTimeZone, 10, async () => {
			const monitors: IMonitorDocument[] = await getUserActiveMonitors(payload.id)
			pubSub.publish('MONITORS_UPDATED', {
				monitorsUpdated: {
					userId: payload.id,
					monitors
				}
			})
		})
	}
}

/**
 * Websocket request doesn't have access to Express' req object. So we need to manually get cookie data from it.
 */
const getCookies = (cookie: string): Record<string, string> => {
	const cookies: Record<string, string> = {}
	cookie.split(';').forEach((cookieData) => {
		const parts: RegExpMatchArray | null = cookieData.match(/(.*?)=(.*)/)
		//setting key/values of broken up cookie
		cookies[parts![1].trim()] = (parts![2] || '').trim()
	})
	return cookies
}
