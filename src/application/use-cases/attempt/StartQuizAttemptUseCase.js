export class StartQuizAttemptUseCase {
  #quizRepository;
  #quizAttemptRepository;

  constructor(quizRepository, quizAttemptRepository) {
    this.#quizRepository = quizRepository;
    this.#quizAttemptRepository = quizAttemptRepository;
  }

  async execute(_quizId, _participantName) {
    throw new Error('Method not implemented');
  }
}

