import { createRouter } from "../../lib/router";
import {
  createPasswordResetHandler,
  createUserHandler,
  getUserHandler,
  listUsersHandler,
  updateUserHandler,
} from "./users.handlers";
import {
  createPasswordResetRoute,
  createUserRoute,
  getUserRoute,
  listUsersRoute,
  updateUserRoute,
} from "./users.routes";

const users = createRouter();
users.openapi(listUsersRoute, listUsersHandler);
users.openapi(createUserRoute, createUserHandler);
users.openapi(getUserRoute, getUserHandler);
users.openapi(updateUserRoute, updateUserHandler);
users.openapi(createPasswordResetRoute, createPasswordResetHandler);

export default users;
