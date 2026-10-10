export class GetQuizByIdUseCase {
  #quizRepository;

  constructor(quizRepository) {
    this.#quizRepository = quizRepository;
  }

  async execute(_quizId) {
    throw new Error('Method not implemented');
  }
}

