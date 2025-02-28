import express from 'express'
import MonitorServer from './server/server'
import { databaseConnection } from './server/database'

const initializeApp = (): void => {
	const app = express()
	const monitorServer = new MonitorServer(app)
	//important to start server after db connects, because immediately our server will try to start prior active cron jobs which require a db connection to find. So this would crash if db isn't ready yet.
	databaseConnection().then(() => {
		monitorServer.start()
	})
}

initializeApp()