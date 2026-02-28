import mongoose from 'mongoose';
import logger from './logger.js';

let isConnected = false;

export async function connectDB(): Promise<void> {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI environment variable is not set');
    }

    try {
        await mongoose.connect(uri);
        isConnected = true;
        logger.info('Connected to MongoDB');
    } catch (err) {
        logger.error({ err }, 'MongoDB connection error');
        throw err;
    }

    mongoose.connection.on('disconnected', () => {
        isConnected = false;
        logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
        isConnected = true;
        logger.info('MongoDB reconnected');
    });

    mongoose.connection.on('error', (err) => {
        logger.error({ err }, 'MongoDB connection error');
    });
}

export function getDBStatus(): 'connected' | 'disconnected' {
    return isConnected ? 'connected' : 'disconnected';
}

export default connectDB;
