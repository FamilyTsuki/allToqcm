import { EntityNotFoundError } from '../../../domain/errors/EntityNotFoundError.js';

export class GetAttemptResultUseCase {
  #quizAttemptRepository;

  constructor(quizAttemptRepository) {
    this.#quizAttemptRepository = quizAttemptRepository;
  }

  async execute(attemptId) {
    const attempt = await this.#quizAttemptRepository.findById(attemptId);
    if (!attempt) {
      throw new EntityNotFoundError('QuizAttempt', attemptId);
    }
    return attempt;
  }
}
