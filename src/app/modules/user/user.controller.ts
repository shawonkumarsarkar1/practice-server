import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { userServices } from './user.service';
import IUser from './user.interface';
import { sendSuccessResponse } from '../../response/sendSuccessResponse';

const createUser = catchAsync(async (req: Request, res: Response) => {
  const data = await userServices.createUserIntoDB(req.body as IUser);

  sendSuccessResponse({
    res,
    statusCode: 201,
    message: 'User created successfully',
    data,
  });
});

export const userControllers = {
  createUser,
};
