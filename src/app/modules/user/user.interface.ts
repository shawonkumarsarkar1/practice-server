interface IUser {
  name: string;
  email: string;
  password: string;
  isDeleted?: boolean;
}

export default IUser;
