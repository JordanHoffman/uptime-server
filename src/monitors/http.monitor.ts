import { IHeartbeat } from "@app/interfaces/heartbeat.interface"
import { IMonitorDocument } from "@app/interfaces/monitor.interface"
import { IEmailLocals } from "@app/interfaces/notification.interface"
import { getMonitorById } from "@app/services/monitor.service"
import { encodeBase64 } from "@app/utils/utils"
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import dayjs from "dayjs"

class HttpMonitor {
	errorCount: number
	noSuccessAlert: boolean
	// emailsLocals: IEmailLocals

	constructor() {
		this.errorCount = 0
		this.noSuccessAlert = true
		// this.emailsLocals
	}

	async start(data: IMonitorDocument): Promise<void> {
		const {
			monitorId,
			httpAuthMethod,
			basicAuthUser,
			basicAuthPass,
			url,
			method,
			headers,
			body,
			timeout,
			redirects,
			bearerToken
		} = data

		let reqTimeout = timeout! * 1000
		const startTime: number = Date.now()

		try { 
			const monitorData: IMonitorDocument = await getMonitorById(monitorId!)
			let basicAuthHeader = {}
			if (httpAuthMethod === 'basic') {
				basicAuthUser = {
					Authorization: `Basic ${encodeBase64(basicAuthUser!, basicAuthPass!)}`
				}
			}
			if (httpAuthMethod === 'token') {
				basicAuthUser = {
					Authorization: `Bearer ${bearerToken}`
				}
			}

			let bodyValue = null
			let reqContentType = null
			if (body!.length > 0) {
				try {
					bodyValue = JSON.parse(body!)
					reqContentType = 'application/json'
				} catch (e) {
					throw new Error('JSON body invalid')
				}
			}

			const options: AxiosRequestConfig = {
				url,
				method: (method || 'get').toLowerCase(),
				timeout: reqTimeout,
				headers: {
					Accept: 'text/html,application/json',
					...(reqContentType ? { 'Content-Type': reqContentType} : {}),
					...basicAuthHeader,
					...(headers ? JSON.parse(headers) : {})
				},
				maxRedirects: redirects
			}
			const response: AxiosResponse = await axios.request(options)
			const responseTime = Date.now() - startTime;
			const heartbeatData: IHeartbeat = {
				monitorId: monitorId!,
				status: 0,
				code: response.status ?? 0,
				message: `${response.status} - ${response.statusText}`,
				timestamp: dayjs.utc().valueOf(),
				reqHeaders: JSON.stringify(response.headers) ?? '',
				resHeaders: JSON.stringify(response.request.res.rawHeaders),
				reqBody: body,
				resBody: JSON.stringify(response.data) ?? '',
				responseTime
			}

			const statusList = JSON.parse(monitorData.statusCode!)
			const responseDurationTime = JSON.parse(monitorData.responseTime!)
			const contentTypeList = monitorData.contentType!.length > 0 ? JSON.parse(monitorData.contentType!) : []

			const doesntIncludeContentType = contentTypeList.length > 0 && !contentTypeList.includes(response.headers['content-type'])
			if (!statusList.includes(response.status) || responseDurationTime > responseTime || doesntIncludeContentType) {
				//throw an error
			} else { 
				// success assertion
			}
		} catch (e) {
			console.log(error)
		}
	}
 }

export const httpMonitor: HttpMonitor = new HttpMonitor()