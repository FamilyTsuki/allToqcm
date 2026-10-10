export class RemoveQuestionUseCase {
  #quizRepository;

  constructor(quizRepository) {
    this.#quizRepository = quizRepository;
  }

  async execute(_quizId, _questionId) {
    throw new Error('Method not implemented');
  }
}

