import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    ...(isProduction
        ? {
            // JSON logging in production
            formatters: {
                level: (label: string) => ({ level: label }),
            },
            timestamp: pino.stdTimeFunctions.isoTime,
        }
        : {
            // Pretty logging in development
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
                    ignore: 'pid,hostname',
                },
            },
        }),
});

export default logger;
