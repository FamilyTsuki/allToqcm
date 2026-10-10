import { EntityNotFoundError } from '../../../domain/errors/EntityNotFoundError.js';

export class GetQuizByIdUseCase {
  #quizRepository;

  constructor(quizRepository) {
    this.#quizRepository = quizRepository;
  }

  async execute(quizId) {
    const quiz = await this.#quizRepository.findById(quizId);
    if (!quiz) {
      throw new EntityNotFoundError('Quiz', quizId);
    }
    return quiz;
  }
}
