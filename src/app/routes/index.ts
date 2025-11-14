import { Router } from 'express';
import { userRoutes } from '../modules/user/user.route';

const router = Router();

const routeModules = [
  {
    path: '/user',
    route: userRoutes,
  },
];

routeModules.forEach(({ path, route }) => router.use(path, route));

export const appRoute = router;
