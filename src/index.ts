import express from 'express'
import MonitorServer from './server/server'

const initializeApp = (): void => {
	const app = express()
	const monitorServer = new MonitorServer(app)
	monitorServer.start()
}

initializeApp()