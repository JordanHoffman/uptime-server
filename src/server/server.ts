import { type Express, json, type NextFunction, type Request, type Response, urlencoded } from 'express'
import http from 'http'
import cors from 'cors'
import { CLIENT_URL, NODE_ENV, PORT, SECRET_KEY_ONE, SECRET_KEY_TWO } from './config'
import { ApolloServer } from '@apollo/server'
import { makeExecutableSchema } from '@graphql-tools/schema';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { expressMiddleware } from '@apollo/server/express4';
import cookieSession from 'cookie-session'
import logger from './logger'
import { mergedGQLSchema } from '@app/graphql/schema'
import { BaseContext } from '@apollo/server'
import { resolvers } from '@app/graphql/resolvers'
import { AppContext } from '@app/interfaces/monitor.interface'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import customFormat from 'dayjs/plugin/customParseFormat'
import { enableAutoRefreshJob, startMonitors } from '@app/utils/utils'
import { WebSocketServer, Server as WSServer } from 'ws'
import { useServer } from 'graphql-ws/use/ws'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customFormat)

/**
 * Unlike typical express app.listen(). We have a seperately made http Server. This allows more granular control and is needed for stuff like web sockets apparently.
 */
export default class MonitorServer {
	private app: Express
	private httpServer: http.Server
	private server: ApolloServer
	private wsServer: WSServer

	constructor(app: Express) {
		this.app = app
		this.httpServer = new http.Server(app)
		this.wsServer = new WebSocketServer({ server: this.httpServer, path: '/graphql' })
		const schema = makeExecutableSchema({ typeDefs: mergedGQLSchema, resolvers })
		const serverCleanup = useServer(
			{
				schema
			},
			this.wsServer
		)
		this.server = new ApolloServer<AppContext | BaseContext>({
			schema,
			//lets us use graphiql tool
			introspection: NODE_ENV !== 'production',
			plugins: [
				//allows graceful shutdown of http server
				ApolloServerPluginDrainHttpServer({ httpServer: this.httpServer}),
				{
					//proper shutdown for websocket server
					async serverWillStart() {
						return {
							async drainServer() {
								await serverCleanup.dispose()
							}
						}
					}
				},
				//disable devtool on production
				NODE_ENV === 'production' ? ApolloServerPluginLandingPageDisabled() : ApolloServerPluginLandingPageLocalDefault({ embed: true })
			]
		})
	}

	async start(): Promise<void> {
		//we need to manually call this b/c we're using the express middleware. This must be called before the middleware starts
		await this.server.start()
		this.standardMiddleware(this.app)
		this.webSocketConnection()
		this.startServer()
	}

	/**
	 * Set up our main middlewares
	 */
	private standardMiddleware(app: Express): void {
		app.set('trust proxy', 1)
		app.use((_req: Request, res: Response, next: NextFunction) => {
			//we dont want browser to cache our health api calls
			res.header('Cache-Control', 'no-cache, no-store, must-revalidate')
			next()
		})
		//Allows us to have a session cookie on the client side. You'll see in the /graphql/resolvers/user login fxs that we set a req.session object and put JWT token data into it. I believe that is what updates/instantiates the cookie for the client. All future requests will have that session object that we can validate for protected routes.
		app.use(
			cookieSession({
				name: 'session',
				keys: [SECRET_KEY_ONE, SECRET_KEY_TWO],
				maxAge: 24 * 7 *3600000, //7 days
				secure: NODE_ENV !== 'development',
				...(NODE_ENV !== 'development' && {
					sameSite: 'none'
				})
			})
		)
		this.graphqlRoute(app)
		this.healthRoute(app)
	}

	/**
	 * Hook up our /graphql api to express
	 */
	private graphqlRoute(app: Express): void {
		app.use(
			'/graphql',
			cors({
				origin: CLIENT_URL,
				credentials: true
			}),
			json({ limit: '200mb' }), //body shouldn't exceed 200mb
			urlencoded({ extended: true, limit: '200mb' }), //no clue, ask chatGPT
			expressMiddleware(this.server, {
				//VERY IMPORTANT: allows our resolvers to get access to express' req & res via this context
				context: async ({req, res}: {req: Request, res: Response}) => {
					return { req, res}
				}
			})
		)
	}

	private healthRoute(app: Express): void {
		app.get('/health', (_req: Request, res: Response) => {
			res.status(200).send('Uptimer monitor service is healthy and OK.')
		})
	}

	/**
	 * When server starts/restarts, the websocket needs to be able to start subscriptions. Much more complicated b/c it doesn't have access to Express req obj, but instead just the typical http req. So it has to tweeze out cookie data via enableAutoRefreshJob to properly start/restart subscriptions.
	 */
	private webSocketConnection() {
		this.wsServer.on('connection', (_ws: WebSocket, req: http.IncomingMessage) => {
			if (req.headers && req.headers.cookie) {
				enableAutoRefreshJob(req.headers.cookie)
			}
		})
	}

	private async startServer(): Promise<void> {
		try {
			const SERVER_PORT: number = parseInt(PORT!, 10) || 5001
			logger.info(`Server has started with process id ${process.pid}`)
			this.httpServer.listen(SERVER_PORT, () => {
				console.info(`Server running on port ${SERVER_PORT}`)
				startMonitors()
			})
		} catch(error) {
			console.error('error', 'startServer() error method:', error)
		}
	}
}

