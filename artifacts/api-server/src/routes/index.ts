import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import registrationsRouter from "./registrations.js";
import corporateEnquiriesRouter from "./corporate-enquiries.js";
import eventsRouter from "./events.js";
import adminEventsRouter from "./admin-events.js";
import adminAuthRouter from "./admin-auth.js";
import adminWalkinsRouter from "./admin-walkins.js";
import adminAmericanoRouter from "./admin-americano.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(registrationsRouter);
router.use(corporateEnquiriesRouter);
router.use(eventsRouter);
router.use(adminAuthRouter);
router.use(adminEventsRouter);
router.use(adminWalkinsRouter);
router.use(adminAmericanoRouter);

export default router;
