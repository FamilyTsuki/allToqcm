import { Router } from 'express';

export function createQuizRouter(controller) {
  const router = Router();

  router.post('/', controller.createQuiz);
  router.get('/', controller.listQuizzes);
  router.get('/:id', controller.getQuizById);
  router.put('/:id', controller.updateQuiz);
  router.delete('/:id', controller.deleteQuiz);
  router.post('/:id/questions', controller.addQuestion);
  router.delete('/:id/questions/:questionId', controller.removeQuestion);

  return router;
}
