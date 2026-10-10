export class ListQuizzesUseCase {
  #quizRepository;

  constructor(quizRepository) {
    this.#quizRepository = quizRepository;
  }

  async execute() {
    return this.#quizRepository.findAll();
  }
}
