import { Router, type IRouter } from "express";
import healthRouter from "./health";
import fyersRouter from "./fyers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(fyersRouter);

export default router;
