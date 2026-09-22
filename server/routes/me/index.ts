import { createRouter } from "../../lib/router";
import { changePasswordHandler, getMeHandler, updateMeHandler } from "./me.handlers";
import { changePasswordRoute, getMeRoute, updateMeRoute } from "./me.routes";

const me = createRouter();
me.openapi(getMeRoute, getMeHandler);
me.openapi(updateMeRoute, updateMeHandler);
me.openapi(changePasswordRoute, changePasswordHandler);

export default me;
