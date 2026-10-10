import { Router } from 'express';

export function createAttemptRouter(controller) {
  const router = Router();

  router.post('/quizzes/:id/attempts', controller.startAttempt);
  router.post('/attempts/:id/submit', controller.submitAttempt);
  router.get('/attempts/:id', controller.getAttemptResult);

  return router;
}
