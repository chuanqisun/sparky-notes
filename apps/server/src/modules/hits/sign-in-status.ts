import assert from "assert";
import type { Request, RequestHandler } from "express";
import type { AsyncResponse } from "./_async-response";
import { bufferedUserTable, updateUserInTable } from "./_user-table";

export const hitsSignInStatus: RequestHandler = async (req, res, next) => {
  try {
    const { data, status } = await getInteractiveSignInStatus(req);
    res.status(status).json(data);
    next();
  } catch (e) {
    next(e);
  }
};

export interface GetSignInStatusInput {
  code_verifier: string;
}

export interface SignInStatusOutput {
  email: string;
  idToken: string;
  userClientId: string;
}

export async function getInteractiveSignInStatus(req: Request): AsyncResponse<SignInStatusOutput> {
  const input = req.body;

  assert(typeof input.code_verifier === "string");
  return new Promise<any>((resolve) => {
    const pollId = setInterval(async () => {
      const users = bufferedUserTable.read();
      const user = users.find((user) => user.code_verifier === input.code_verifier);
      if (user) {
        clearInterval(pollId);
        clearTimeout(timeoutId);

        // exclude verifier in the table. We use it only once
        const { code_verifier, ...userWithoutVerifier } = user;

        const updatedUsers = updateUserInTable(users, userWithoutVerifier);
        bufferedUserTable.write(updatedUsers);

        resolve({
          status: 200,
          data: {
            email: user.email,
            idToken: user.idToken,
            userClientId: user.userClientId,
          },
        });
      }
    }, 3000);

    const timeoutId = setTimeout(() => {
      clearInterval(pollId);
      resolve({ status: 408 });
    }, 60000);
  }).catch(() => {
    return {
      status: 500,
    };
  });
}
