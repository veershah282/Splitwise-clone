import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
    _id: Types.ObjectId;
    name: string;
    email: string;
    password?: string;
    isRegistered: boolean;
    friends: Types.ObjectId[];
    refreshToken?: string;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            maxlength: 255,
        },
        password: {
            type: String,
            required: false, // Optional for placeholder/non-registered users
        },
        isRegistered: {
            type: Boolean,
            default: true,
        },
        friends: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        refreshToken: {
            type: String,
            select: false, // Never return in queries by default
        },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform(_doc, ret: any) {
                ret.id = ret._id.toString();
                delete ret.password;
                delete ret.refreshToken;
                delete ret.__v;
                return ret;
            },
        },
        toObject: {
            virtuals: true,
        },
    }
);

export const User = mongoose.model<IUser>('User', userSchema);
export default User;
