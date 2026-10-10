import { EntityNotFoundError } from '../../../domain/errors/EntityNotFoundError.js';

export class DeleteQuizUseCase {
  #quizRepository;

  constructor(quizRepository) {
    this.#quizRepository = quizRepository;
  }

  async execute(quizId) {
    const quiz = await this.#quizRepository.findById(quizId);
    if (!quiz) {
      throw new EntityNotFoundError('Quiz', quizId);
    }

    await this.#quizRepository.delete(quizId);
  }
}
