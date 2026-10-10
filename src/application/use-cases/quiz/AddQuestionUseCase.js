export class AddQuestionUseCase {
  #quizRepository;

  constructor(quizRepository) {
    this.#quizRepository = quizRepository;
  }

  async execute(_quizId, _questionData) {
    throw new Error('Method not implemented');
  }
}

