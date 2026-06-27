import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dmsAuthRouter from "./dms/auth";
import dmsUsersRouter from "./dms/users";
import dmsProjectsRouter from "./dms/projects";
import dmsDocumentsRouter from "./dms/documents";
import dmsDashboardRouter from "./dms/dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dmsAuthRouter);
router.use(dmsUsersRouter);
router.use(dmsProjectsRouter);
router.use(dmsDocumentsRouter);
router.use(dmsDashboardRouter);

export default router;
