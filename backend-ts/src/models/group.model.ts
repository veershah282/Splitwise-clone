import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGroup extends Document {
    _id: Types.ObjectId;
    name: string;
    description?: string;
    createdBy: Types.ObjectId;
    members: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const groupSchema = new Schema<IGroup>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        members: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
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

export const Group = mongoose.model<IGroup>('Group', groupSchema);
export default Group;
