import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import linkedInAuthRouter from "./auth-linkedin.js";
import membersRouter from "./members.js";
import registrationsRouter from "./registrations.js";
import corporateEnquiriesRouter from "./corporate-enquiries.js";
import eventsRouter from "./events.js";
import adminEventsRouter from "./admin-events.js";
import adminAuthRouter from "./admin-auth.js";
import adminWalkinsRouter from "./admin-walkins.js";
import adminAmericanoRouter from "./admin-americano.js";
import adminChargeRouter from "./admin-charge.js";
import shopRouter from "./shop.js";
import adminInsightsRouter from "./admin-insights.js";
import unsubscribeRouter from "./unsubscribe.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(linkedInAuthRouter);
router.use(membersRouter);
router.use(registrationsRouter);
router.use(corporateEnquiriesRouter);
router.use(eventsRouter);
router.use(adminAuthRouter);
router.use(adminEventsRouter);
router.use(adminWalkinsRouter);
router.use(adminAmericanoRouter);
router.use(adminChargeRouter);
router.use(shopRouter);
router.use(adminInsightsRouter);
router.use(unsubscribeRouter);

export default router;
