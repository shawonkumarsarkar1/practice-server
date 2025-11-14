import IUser from './user.interface';
import userModel from './user.model';

const createUserIntoDB = async (payload: IUser): Promise<IUser> => {
  const result = await userModel.create(payload);
  return result;
};

export const userServices = {
  createUserIntoDB,
};
