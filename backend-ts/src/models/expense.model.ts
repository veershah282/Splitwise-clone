import mongoose, { Schema, Document, Types } from 'mongoose';

// Split types supported by the system
export enum SplitType {
    EQUAL = 'EQUAL',
    EXACT = 'EXACT',
    PERCENTAGE = 'PERCENTAGE',
    SHARES = 'SHARES',
}

// Embedded sub-document for individual split entries
export interface IEmbeddedSplit {
    user: Types.ObjectId;
    amount: number;
    percentage?: number;
    shares?: number;
}

const embeddedSplitSchema = new Schema<IEmbeddedSplit>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        percentage: {
            type: Number,
        },
        shares: {
            type: Number,
        },
    },
    { _id: false }
);

export interface IExpense extends Document {
    _id: Types.ObjectId;
    description: string;
    amount: number;
    date: Date;
    paidBy: Types.ObjectId;
    group: Types.ObjectId | null;
    splitType: SplitType;
    splitDetails: IEmbeddedSplit[];
    category?: string;
    createdBy: Types.ObjectId;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
    {
        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,
        },
        amount: {
            type: Number,
            required: true,
        },
        date: {
            type: Date,
            default: Date.now,
        },
        paidBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        group: {
            type: Schema.Types.ObjectId,
            ref: 'Group',
            required: false,
            default: null,
        },
        splitType: {
            type: String,
            enum: Object.values(SplitType),
            default: SplitType.EQUAL,
        },
        splitDetails: [embeddedSplitSchema],
        category: {
            type: String,
            trim: true,
            maxlength: 100,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform(_doc, ret: any) {
                ret.id = ret._id.toString();
                delete ret.__v;
                return ret;
            },
        },
        toObject: {
            virtuals: true,
        },
    }
);

// Indexes for performance (PRD Section 5)
expenseSchema.index({ group: 1 });
expenseSchema.index({ paidBy: 1 });
expenseSchema.index({ date: -1 });
expenseSchema.index({ group: 1, isDeleted: 1 });

export const Expense = mongoose.model<IExpense>('Expense', expenseSchema);
export default Expense;
