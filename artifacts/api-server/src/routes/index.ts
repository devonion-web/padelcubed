import { Router, type IRouter } from "express";
import healthRouter from "./health";
import registrationsRouter from "./registrations";
import corporateEnquiriesRouter from "./corporate-enquiries";
import eventsRouter from "./events";

const router: IRouter = Router();

router.use(healthRouter);
router.use(registrationsRouter);
router.use(corporateEnquiriesRouter);
router.use(eventsRouter);

export default router;
