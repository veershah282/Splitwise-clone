import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISettlement extends Document {
    _id: Types.ObjectId;
    amount: number;
    paidBy: Types.ObjectId;
    paidTo: Types.ObjectId;
    group: Types.ObjectId;
    note: string;
    date: Date;
    createdAt: Date;
    updatedAt: Date;
}

const settlementSchema = new Schema<ISettlement>(
    {
        amount: {
            type: Number,
            required: true,
            min: 0.01,
        },
        paidBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        paidTo: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        group: {
            type: Schema.Types.ObjectId,
            ref: 'Group',
            required: true,
        },
        note: {
            type: String,
            trim: true,
            maxlength: 255,
            default: 'Settlement',
        },
        date: {
            type: Date,
            default: Date.now,
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

// Indexes (PRD Section 5)
settlementSchema.index({ group: 1 });
settlementSchema.index({ paidBy: 1 });
settlementSchema.index({ paidTo: 1 });
settlementSchema.index({ group: 1, paidBy: 1, paidTo: 1 });

export const Settlement = mongoose.model<ISettlement>('Settlement', settlementSchema);
export default Settlement;
