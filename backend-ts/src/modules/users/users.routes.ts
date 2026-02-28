import { Router } from 'express';
import * as usersController from './users.controller.js';
import authMiddleware from '../../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/me', usersController.getMe);
router.get('/friends', usersController.getFriends);
router.post('/friends', usersController.addFriend);

export default router;
