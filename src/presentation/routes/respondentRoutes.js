import { Router } from 'express';
import { RateLimiter } from '../middlewares/rateLimiter.js';

export function createRespondentRouter(controller, options = {}) {
  const router = Router();
  const responseLimiter = options.responseLimiter || new RateLimiter(60000, 60);

  router.get('/surveys', controller.listSurveys);
  router.get('/surveys/:id', controller.getSurvey);
  router.post('/surveys/:id/responses', responseLimiter.middleware(), controller.submitResponse);

  return router;
}
