import 'dotenv/config';
console.log('--- STARTING SERVER ---');
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { IncomingMessage, ServerResponse } from 'http';
import { connectDB, getDBStatus } from './lib/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './lib/logger.js';
import apiRoutes from './routes/api.routes.js';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { pinoHttp } from 'pino-http';

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for rate limiting if behind a load balancer
app.set('trust proxy', 1);

const swaggerOptions = {
    definition: {
        openapi: '3.1.0',
        info: {
            title: 'Splitwise Clone API',
            version: '1.0.0',
            description: 'AI-powered backend for Splitwise',
        },
        servers: [
            { url: 'http://localhost:5000/api', description: 'API' },
        ],
    },
    apis: ['./src/modules/**/*.ts', './src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Security Middlewares
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
}));

// Request ID and Logging
app.use(pinoHttp({
    logger,
    genReqId: (req: IncomingMessage) => req.headers['x-request-id'] as string || crypto.randomUUID(),
    customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
    },
}));

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting (General)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per window
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});
app.use(limiter);

// Health Check
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        db: getDBStatus(),
        timestamp: new Date().toISOString(),
        version: '1.0.0-ts'
    });
});

// API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Root Route
app.get('/', (_req, res) => {
    res.send('Splitwise Clone API is running...');
});

// Routes
app.use('/api', apiRoutes);

// Error Handling
app.use(errorHandler);

// Global declaration for Request ID
declare global {
    namespace Express {
        interface Request {
            id: string;
        }
    }
}

// Start Server
async function start() {
    try {
        await connectDB();
        app.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT}`);
            logger.info(`✨ API: http://localhost:${PORT}/api`);
        });
    } catch (err) {
        logger.error({ err }, 'Failed to start server');
        process.exit(1);
    }
}

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
    logger.error({ err }, 'Unhandled Rejection');
});

start();
