import { createRouter } from "../../lib/router";
import { getPushKeyHandler } from "./pushKey.handlers";
import { getPushKeyRoute } from "./pushKey.routes";

const pushKey = createRouter();
pushKey.openapi(getPushKeyRoute, getPushKeyHandler);

export default pushKey;
