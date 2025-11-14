import { Router } from 'express';
import { userControllers } from './user.controller';

const router = Router();

router.post('/create', userControllers.createUser);

export const userRoutes = router;
