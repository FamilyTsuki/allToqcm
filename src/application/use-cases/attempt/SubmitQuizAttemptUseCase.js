export class SubmitQuizAttemptUseCase {
  #quizRepository;
  #quizAttemptRepository;

  constructor(quizRepository, quizAttemptRepository) {
    this.#quizRepository = quizRepository;
    this.#quizAttemptRepository = quizAttemptRepository;
  }

  async execute(_attemptId, _submitAttemptDTO) {
    throw new Error('Method not implemented');
  }
}

