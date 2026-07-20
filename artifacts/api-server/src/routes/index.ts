import { Router, type IRouter } from "express";
import healthRouter from "./health";
import registrationsRouter from "./registrations";
import corporateEnquiriesRouter from "./corporate-enquiries";

const router: IRouter = Router();

router.use(healthRouter);
router.use(registrationsRouter);
router.use(corporateEnquiriesRouter);

export default router;
