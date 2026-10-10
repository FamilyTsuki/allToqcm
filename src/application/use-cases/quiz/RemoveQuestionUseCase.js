import { EntityNotFoundError } from '../../../domain/errors/EntityNotFoundError.js';

export class RemoveQuestionUseCase {
  #quizRepository;

  constructor(quizRepository) {
    this.#quizRepository = quizRepository;
  }

  async execute(quizId, questionId) {
    const quiz = await this.#quizRepository.findById(quizId);
    if (!quiz) {
      throw new EntityNotFoundError('Quiz', quizId);
    }

    quiz.removeQuestion(questionId);
    await this.#quizRepository.update(quiz);
  }
}
