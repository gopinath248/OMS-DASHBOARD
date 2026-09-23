import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import appDataRouter from "./appData";
import notificationsRouter from "./notifications";
import peopleRouter from "./people";
import salaryRouter from "./salary";
import chatRouter from "./chat";
import leaveRouter from "./leave";
import dmsAuthRouter from "./dms/auth";
import dmsUsersRouter from "./dms/users";
import dmsProjectsRouter from "./dms/projects";
import dmsDocumentsRouter from "./dms/documents";
import dmsDashboardRouter from "./dms/dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(appDataRouter);
router.use(notificationsRouter);
router.use(peopleRouter);
router.use(salaryRouter);
router.use(chatRouter);
router.use(leaveRouter);
router.use(dmsAuthRouter);
router.use(dmsUsersRouter);
router.use(dmsProjectsRouter);
router.use(dmsDocumentsRouter);
router.use(dmsDashboardRouter);

export default router;
