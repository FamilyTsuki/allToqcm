export class UpdateQuizUseCase {
  #quizRepository;

  constructor(quizRepository) {
    this.#quizRepository = quizRepository;
  }

  async execute(_quizId, _dto) {
    throw new Error('Method not implemented');
  }
}

