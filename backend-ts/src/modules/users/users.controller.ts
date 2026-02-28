import { Request, Response } from 'express';
import User from '../../models/user.model.js';
import { NotFoundError } from '../../lib/errors.js';

export async function getMe(req: Request, res: Response): Promise<void> {
    const user = await User.findById(req.user!.id).select('-password');
    if (!user) throw new NotFoundError('User');

    res.json({ success: true, data: user });
}

export async function getFriends(req: Request, res: Response): Promise<void> {
    const user = await User.findById(req.user!.id).populate('friends', 'name email');
    if (!user) throw new NotFoundError('User');

    res.json({ success: true, data: user.friends });
}

export async function addFriend(req: Request, res: Response): Promise<void> {
    const { email } = req.body;
    const friend = await User.findOne({ email });
    if (!friend) throw new NotFoundError('Friend');

    const user = await User.findById(req.user!.id);
    if (!user) throw new NotFoundError('User');

    if (!user.friends.includes(friend._id as any)) {
        user.friends.push(friend._id as any);
        await user.save();
    }

    res.json({ success: true, data: friend });
}
