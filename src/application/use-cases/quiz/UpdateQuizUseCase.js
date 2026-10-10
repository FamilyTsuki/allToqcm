import { EntityNotFoundError } from '../../../domain/errors/EntityNotFoundError.js';

export class UpdateQuizUseCase {
  #quizRepository;

  constructor(quizRepository) {
    this.#quizRepository = quizRepository;
  }

  async execute(quizId, { title, description }) {
    const quiz = await this.#quizRepository.findById(quizId);
    if (!quiz) {
      throw new EntityNotFoundError('Quiz', quizId);
    }

    quiz.updateDetails(title, description);
    await this.#quizRepository.update(quiz);

    return quiz;
  }
}
