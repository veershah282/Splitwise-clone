import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/user.model.js';
import Group from '../src/models/group.model.js';
import Expense from '../src/models/expense.model.js';
import Settlement from '../src/models/settlement.model.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
}

async function seed() {
    try {
        console.log('🌱 Connecting to database...');
        await mongoose.connect(MONGODB_URI!);

        console.log('🧹 Cleaning collections...');
        await User.deleteMany({});
        await Group.deleteMany({});
        await Expense.deleteMany({});
        await Settlement.deleteMany({});

        console.log('👤 Creating users...');
        const salt = await bcrypt.genSalt(12);
        const password = await bcrypt.hash('password123', salt);

        const veer = await User.create({
            name: 'Veer Shah',
            email: 'veershaha282@gmail.com',
            password,
            isRegistered: true,
        });

        const alice = await User.create({
            name: 'Alice',
            email: 'alice@example.com',
            password,
            isRegistered: true,
        });

        const bob = await User.create({
            name: 'Bob',
            email: 'bob@example.com',
            password,
            isRegistered: true,
        });

        const placeholder = await User.create({
            name: 'Placeholder User',
            email: 'placeholder@splitwise.local',
            isRegistered: false,
        });

        console.log('👥 Creating group...');
        const group = await Group.create({
            name: 'London Trip 2026',
            description: 'Expenses for our summer trip',
            createdBy: veer._id,
            members: [veer._id, alice._id, bob._id, placeholder._id],
        });

        console.log('💸 Creating expenses...');
        // Expense 1: Veer paid for Dinner, split equally
        await Expense.create({
            description: 'Fancy Dinner',
            amount: 4000,
            paidBy: veer._id,
            group: group._id,
            splitType: 'EQUAL',
            splitDetails: [
                { user: veer._id, amount: 1000 },
                { user: alice._id, amount: 1000 },
                { user: bob._id, amount: 1000 },
                { user: placeholder._id, amount: 1000 },
            ],
            createdBy: veer._id,
        });

        // Expense 2: Alice paid for Hotel, Veer and Alice split
        await Expense.create({
            description: 'Hotel Deposit',
            amount: 2000,
            paidBy: alice._id,
            group: group._id,
            splitType: 'EXACT',
            splitDetails: [
                { user: veer._id, amount: 1000 },
                { user: alice._id, amount: 1000 },
            ],
            createdBy: alice._id,
        });

        console.log('🤝 Creating settlements...');
        // Veer pays Alice 500
        await Settlement.create({
            amount: 500,
            paidBy: veer._id,
            paidTo: alice._id,
            group: group._id,
            note: 'Partial hotel payment',
            date: new Date(),
        });

        console.log('✅ Seeding complete!');
        console.log('--- Credentials ---');
        console.log('Email: veershaha282@gmail.com');
        console.log('Password: password123');
        console.log('-------------------');

        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

seed();
