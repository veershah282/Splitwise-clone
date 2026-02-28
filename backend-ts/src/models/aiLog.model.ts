import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAIParseLog extends Document {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    rawInput: string;
    parsedOutput: Record<string, unknown>;
    confirmed: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const aiParseLogSchema = new Schema<IAIParseLog>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        rawInput: {
            type: String,
            required: true,
        },
        parsedOutput: {
            type: Schema.Types.Mixed,
            required: true,
        },
        confirmed: {
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
    }
);

aiParseLogSchema.index({ userId: 1 });

export const AIParseLog = mongoose.model<IAIParseLog>('AIParseLog', aiParseLogSchema);
export default AIParseLog;
