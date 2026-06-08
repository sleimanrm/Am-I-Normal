import { Router, type IRouter } from "express";
import healthRouter from "./health";
import habitsRouter from "./habits";
import answersRouter from "./answers";
import submissionsRouter from "./submissions";
import traitScoresRouter from "./traitScores";

const router: IRouter = Router();

router.use(healthRouter);
router.use(habitsRouter);
router.use(answersRouter);
router.use(submissionsRouter);
router.use(traitScoresRouter);

export default router;
