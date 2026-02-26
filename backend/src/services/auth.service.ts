import { getDatabase, dbHelpers } from "../config/database.js";
import { comparePassword } from "../utils/password.util.js";
import { generateToken } from "../utils/jwt.util.js";

export interface LoginCredentials {
  email: string;
  password: string;
}

export const login = async (credentials: LoginCredentials) => {
  await dbHelpers.read();
  const db = getDatabase();
  const user = db.data.users.find(
    (u) => u.email.toLowerCase() === credentials.email.toLowerCase()
  );

  if (!user) {
    return null;
  }

  const isValid = await comparePassword(credentials.password, user.password);
  if (!isValid) {
    return null;
  }

  const { password, ...userWithoutPassword } = user;
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId,
  });

  return {
    user: userWithoutPassword,
    token,
  };
};

export const getUserById = async (userId: string) => {
  await dbHelpers.read();
  const db = getDatabase();
  const user = db.data.users.find((u) => u.id === userId);
  if (!user) {
    return null;
  }
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
