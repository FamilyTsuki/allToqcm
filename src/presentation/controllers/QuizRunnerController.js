import { SubmitAttemptDTO } from '../../application/dtos/SubmitAttemptDTO.js';

export class QuizRunnerController {
  #startQuizAttemptUseCase;
  #submitQuizAttemptUseCase;
  #getAttemptResultUseCase;

  constructor({ startQuizAttemptUseCase, submitQuizAttemptUseCase, getAttemptResultUseCase }) {
    this.#startQuizAttemptUseCase = startQuizAttemptUseCase;
    this.#submitQuizAttemptUseCase = submitQuizAttemptUseCase;
    this.#getAttemptResultUseCase = getAttemptResultUseCase;

    this.startAttempt = this.startAttempt.bind(this);
    this.submitAttempt = this.submitAttempt.bind(this);
    this.getAttemptResult = this.getAttemptResult.bind(this);
  }

  async startAttempt(req, res, next) {
    try {
      const { participantName } = req.body;
      const result = await this.#startQuizAttemptUseCase.execute(req.params.id, participantName);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async submitAttempt(req, res, next) {
    try {
      const dto = SubmitAttemptDTO.fromJSON(req.body);
      const attempt = await this.#submitQuizAttemptUseCase.execute(req.params.id, dto);
      res.status(200).json(attempt.toJSON());
    } catch (error) {
      next(error);
    }
  }

  async getAttemptResult(req, res, next) {
    try {
      const attempt = await this.#getAttemptResultUseCase.execute(req.params.id);
      res.status(200).json(attempt.toJSON());
    } catch (error) {
      next(error);
    }
  }
}
