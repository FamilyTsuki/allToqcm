import { Router } from 'express';
import { RateLimiter } from '../middlewares/rateLimiter.js';

export function createCreatorRouter(controller, options = {}) {
  const router = Router();
  const createLimiter = options.createLimiter || new RateLimiter(60000, 30);

  router.post('/surveys', createLimiter.middleware(), controller.createSurvey);
  router.get('/surveys', controller.listSurveys);
  router.get('/surveys/compare', controller.compareSurveys);
  router.get('/surveys/:id', controller.getSurveyById);
  router.delete('/surveys/:id', controller.deleteSurvey);
  router.get('/surveys/:id/stats', controller.getSurveyStats);
  router.get('/surveys/:id/share', controller.getSurveyShare);
  router.post('/surveys/:id/toggle-status', controller.toggleStatus);
  router.post('/surveys/:id/duplicate', controller.duplicateSurvey);
  router.get('/surveys/:id/export/csv', controller.exportCsv);

  return router;
}
