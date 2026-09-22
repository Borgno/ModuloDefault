import { createRouter } from "../../lib/router";
import { getUserStatsHandler } from "./userStats.handlers";
import { getUserStatsRoute } from "./userStats.routes";

const userStats = createRouter();
userStats.openapi(getUserStatsRoute, getUserStatsHandler);

export default userStats;
