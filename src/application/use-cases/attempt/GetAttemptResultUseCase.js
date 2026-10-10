export class GetAttemptResultUseCase {
  #quizAttemptRepository;

  constructor(quizAttemptRepository) {
    this.#quizAttemptRepository = quizAttemptRepository;
  }

  async execute(_attemptId) {
    throw new Error('Method not implemented');
  }
}

