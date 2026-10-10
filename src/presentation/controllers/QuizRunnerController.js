export class QuizRunnerController {
  #startQuizAttemptUseCase;
  #submitQuizAttemptUseCase;
  #getAttemptResultUseCase;

  constructor({ startQuizAttemptUseCase, submitQuizAttemptUseCase, getAttemptResultUseCase }) {
    this.#startQuizAttemptUseCase = startQuizAttemptUseCase;
    this.#submitQuizAttemptUseCase = submitQuizAttemptUseCase;
    this.#getAttemptResultUseCase = getAttemptResultUseCase;
  }

  async startAttempt(_req, _res, _next) {
    throw new Error('Method not implemented');
  }

  async submitAttempt(_req, _res, _next) {
    throw new Error('Method not implemented');
  }

  async getAttemptResult(_req, _res, _next) {
    throw new Error('Method not implemented');
  }
}
