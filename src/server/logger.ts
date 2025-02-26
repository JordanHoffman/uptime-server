import pino from 'pino'

//Not sure why author prefers this to typical console logs. Throughout the app you'll see logger.info(), logger.error() instead of console logs/errors. That's what pino package is for.
export default pino({})