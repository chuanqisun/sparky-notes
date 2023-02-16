import path from "path";
import { BufferedJsonFile } from "../../utils/fs";

export const bufferedUserTable = new BufferedJsonFile<any[]>(path.join(process.cwd(), "db", "users.json")).init("[]");

export function updateUserInTable<T extends { email: string; userClientId: string }>(table: T[], userToUpdate: T) {
  return [
    { ...userToUpdate, email: userToUpdate.email },
    // ensure uniqueness by using (email, userClientId) tuple as a multi-column key
    ...table.filter((user) => user.email !== userToUpdate.email || user.userClientId !== userToUpdate.userClientId),
  ];
}

export function removeUserInTable<T extends { email: string; userClientId: string }>(table: T[], userToRemove: T) {
  return table.filter((user) => user.email !== userToRemove.email || user.userClientId !== userToRemove.userClientId);
}
