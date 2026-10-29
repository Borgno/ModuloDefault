import { createRouter } from "../../lib/router";
import { getNoticeMuteHandler, putNoticeMuteHandler } from "./noticeMute.handlers";
import { getNoticeMuteRoute, putNoticeMuteRoute } from "./noticeMute.routes";

const noticeMute = createRouter();
noticeMute.openapi(getNoticeMuteRoute, getNoticeMuteHandler);
noticeMute.openapi(putNoticeMuteRoute, putNoticeMuteHandler);

export default noticeMute;
