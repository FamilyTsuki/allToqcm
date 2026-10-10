export class QuizCreatorController {
  #createQuizUseCase;
  #getQuizByIdUseCase;
  #listQuizzesUseCase;
  #updateQuizUseCase;
  #deleteQuizUseCase;
  #addQuestionUseCase;
  #removeQuestionUseCase;

  constructor({
    createQuizUseCase,
    getQuizByIdUseCase,
    listQuizzesUseCase,
    updateQuizUseCase,
    deleteQuizUseCase,
    addQuestionUseCase,
    removeQuestionUseCase,
  }) {
    this.#createQuizUseCase = createQuizUseCase;
    this.#getQuizByIdUseCase = getQuizByIdUseCase;
    this.#listQuizzesUseCase = listQuizzesUseCase;
    this.#updateQuizUseCase = updateQuizUseCase;
    this.#deleteQuizUseCase = deleteQuizUseCase;
    this.#addQuestionUseCase = addQuestionUseCase;
    this.#removeQuestionUseCase = removeQuestionUseCase;
  }

  async createQuiz(_req, _res, _next) {
    throw new Error('Method not implemented');
  }

  async getQuizById(_req, _res, _next) {
    throw new Error('Method not implemented');
  }

  async listQuizzes(_req, _res, _next) {
    throw new Error('Method not implemented');
  }

  async updateQuiz(_req, _res, _next) {
    throw new Error('Method not implemented');
  }

  async deleteQuiz(_req, _res, _next) {
    throw new Error('Method not implemented');
  }

  async addQuestion(_req, _res, _next) {
    throw new Error('Method not implemented');
  }

  async removeQuestion(_req, _res, _next) {
    throw new Error('Method not implemented');
  }
}

