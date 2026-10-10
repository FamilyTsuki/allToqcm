export class ListQuizzesUseCase {
  #quizRepository;

  constructor(quizRepository) {
    this.#quizRepository = quizRepository;
  }

  async execute() {
    throw new Error('Method not implemented');
  }
}

