import { IMonitorDocument } from "@app/interfaces/monitor.interface";
import { MonitorModel } from "@app/models/monitor.model";
import { Model, Op } from "sequelize";
import { getSingleNotificationGroup } from "./notification.service";
import dayjs from "dayjs";

const HTTP_TYPE = 'http'
const TCP_TYPE = 'tcp'
const MONGO_TYPE = 'mongodb'
const REDIS_TYPE = 'redis'


/**
 * create a new monitor for a user
 */
export const createMonitor = async (data: IMonitorDocument): Promise<IMonitorDocument> => {
	try {
		const result: Model = await MonitorModel.create(data)
		return result.dataValues
	} catch (error) {
		throw new Error(error)
	}
}

/**
 * Gets the monitors for a user (active & inactive). If active is set true, then it will only get the active monitors
 */
export const getUserMonitors = async (userId: number, active?: boolean): Promise<IMonitorDocument[]> => {
	try {
		const monitors: IMonitorDocument[] = await MonitorModel.findAll({
			raw: true,
			where: {
				[Op.and]: [{
					userId, 
					...(active && { active: true })
				}]
			},
			order: [
				['createdAt', 'DESC']
			]
		}) as unknown as IMonitorDocument[]
		return monitors
	} catch (error) {
		throw new Error(error)
	}
}

/**
 * Get all active monitors for a user
 */
export const getUserActiveMonitors = async (userId: number): Promise<IMonitorDocument[]> => {
	try {
		const monitors: IMonitorDocument[] = await getUserMonitors(userId, true)
		for (let monitor of monitors) {
			console.log(monitor)
		}
		return monitors
	} catch (error) {
		throw new Error(error)
	}
}

/**
 * Returns all active monitors for all users
 */
export const getAllUsersActiveMonitors = async (): Promise<IMonitorDocument[]> => {
	try {
		const monitors: IMonitorDocument[] = await MonitorModel.findAll({
			raw: true,
			where: {
				active: true
			},
			order: [
				['createdAt', 'DESC']
			]
		}) as unknown as IMonitorDocument[]
		return monitors
	} catch (error) {
		throw new Error(error)
	}
}

/**
 * Get monitor by id. returns the notification group with it.
 */
export const getMonitorById = async (monitorId: number): Promise<IMonitorDocument> => {
	try {
		const monitor: IMonitorDocument = await MonitorModel.findOne({
			raw: true,
			where: {
				id: monitorId
			},
		}) as unknown as IMonitorDocument
		let updatedMonitor: IMonitorDocument = { ...monitor }
		const notifications = await getSingleNotificationGroup(updatedMonitor.notificationId!)
		updatedMonitor = {...updatedMonitor, notifications}
		return monitor
	} catch (error) {
		throw new Error(error)
	}
}

export const toggleMonitor = async (monitorId: number, userId: number, active: boolean): Promise<IMonitorDocument[]> => {
	try {
		await MonitorModel.update(
			{ active },
			{
				where: {
					[Op.and]: [{id: monitorId}, { userId }]
				}
			}
		)
		const result: IMonitorDocument[] = await getUserMonitors(userId)
		return result
	} catch(error) {
		throw new Error(error)
	}
}

export const updateSingleMonitor = async (monitorId: number, userId: number, data: IMonitorDocument): Promise<IMonitorDocument[]> => {
	try {
		await MonitorModel.update(
			data,
			{
				where: {id: monitorId}
			}
		)
		const result: IMonitorDocument[] = await getUserMonitors(userId)
		return result
	} catch(error) {
		throw new Error(error)
	}
}

//0 success, 1 error

export const updateMonitorStatus = async (monitor: IMonitorDocument, timestamp: number, type: string): Promise<IMonitorDocument> => {
	try {
		const now = timestamp ? dayjs(timestamp).toDate() : dayjs().toDate()
		const { id, status } = monitor
		const updatedMonitor: IMonitorDocument = {...monitor}
		updatedMonitor.status = type === 'success' ? 0: 1
		const isStatus = type === 'success' ? true : false
		//ensures that lastChanged only updates when status changes from success to fail or vice versa
		if (isStatus && status === 1) {
			updatedMonitor.lastChanged = now
		} else if (!isStatus && status === 0) {
			updatedMonitor.lastChanged = now
		}

		await MonitorModel.update(updatedMonitor, { where: { id }})
		return updatedMonitor
	} catch (error) {
		throw new Error(error)
	}
}

export const deleteSingleMonitor = async (monitorId: number, userId: number, type: string): Promise<IMonitorDocument[]> => {
	try { 
		console.log(type)
		await deleteMonitorTypeHeartbeats(monitorId, type)
		await MonitorModel.destroy({
			where: { id: monitorId}
		})
		const result: IMonitorDocument[] = await getUserMonitors(userId)
		return result
	} catch (error) {
		throw new Error(error)
	}
}

export const startCreatedMonitors = (monitor: IMonitorDocument, name: string, type: string): void => {
	switch (type) {
		case HTTP_TYPE:
			console.log('http', monitor.name, name)
			break;
		case TCP_TYPE:
			console.log('tcp', monitor.name, name)
			break;
		case MONGO_TYPE:
			console.log('mongodb', monitor.name, name)
			break;
		case REDIS_TYPE:
			console.log('redis', monitor.name, name)
			break;
	}
}

// TODO: Create method to delete monitor heartbeats. (Teacher stated that cascade deletion to automatically do this gave him many issues)
const deleteMonitorTypeHeartbeats = async (monitorId: number, type: string): Promise<void> => {
	console.log(monitorId, type)
}