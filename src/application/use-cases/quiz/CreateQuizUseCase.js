export class CreateQuizUseCase {
  #quizRepository;

  constructor(quizRepository) {
    this.#quizRepository = quizRepository;
  }

  async execute(_dto) {
    throw new Error('Method not implemented');
  }
}

