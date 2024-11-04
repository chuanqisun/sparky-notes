import type { Request, RequestHandler } from "express";
import type { AsyncResponse } from "./_async-response";
import { bufferedUserTable, removeUserInTable } from "./_user-table";

export const hitsSignOut: RequestHandler = async (req, res, next) => {
  try {
    const { data, status } = await signOut(req);
    res.status(status).json(data);
    next();
  } catch (e) {
    next(e);
  }
};

export interface SignOutInput {
  email: string;
  idToken: string;
  userClientId: string;
}

export type SignOutOutput = {};

export async function signOut(req: Request): AsyncResponse<SignOutOutput> {
  const input: SignOutInput = req.body;

  const users = bufferedUserTable.read();
  const user = users.find((user) => user.email === input.email && user.idToken === input.idToken && user.userClientId === input.userClientId);

  if (!user) {
    return {
      status: 404,
    };
  }

  const updatedUsers = removeUserInTable(users, user);
  bufferedUserTable.write(updatedUsers);

  return {
    status: 200,
    data: {},
  };
}
