import { CreateQuizDTO } from '../../application/dtos/CreateQuizDTO.js';

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

    this.createQuiz = this.createQuiz.bind(this);
    this.getQuizById = this.getQuizById.bind(this);
    this.listQuizzes = this.listQuizzes.bind(this);
    this.updateQuiz = this.updateQuiz.bind(this);
    this.deleteQuiz = this.deleteQuiz.bind(this);
    this.addQuestion = this.addQuestion.bind(this);
    this.removeQuestion = this.removeQuestion.bind(this);
  }

  async createQuiz(req, res, next) {
    try {
      const dto = CreateQuizDTO.fromJSON(req.body);
      const quiz = await this.#createQuizUseCase.execute(dto);
      res.status(201).json(quiz.toJSON());
    } catch (error) {
      next(error);
    }
  }

  async getQuizById(req, res, next) {
    try {
      const quiz = await this.#getQuizByIdUseCase.execute(req.params.id);
      res.status(200).json(quiz.toJSON());
    } catch (error) {
      next(error);
    }
  }

  async listQuizzes(_req, res, next) {
    try {
      const quizzes = await this.#listQuizzesUseCase.execute();
      res.status(200).json(quizzes.map((q) => q.toJSON()));
    } catch (error) {
      next(error);
    }
  }

  async updateQuiz(req, res, next) {
    try {
      const quiz = await this.#updateQuizUseCase.execute(req.params.id, req.body);
      res.status(200).json(quiz.toJSON());
    } catch (error) {
      next(error);
    }
  }

  async deleteQuiz(req, res, next) {
    try {
      await this.#deleteQuizUseCase.execute(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async addQuestion(req, res, next) {
    try {
      const question = await this.#addQuestionUseCase.execute(req.params.id, req.body);
      res.status(201).json(question.toJSON());
    } catch (error) {
      next(error);
    }
  }

  async removeQuestion(req, res, next) {
    try {
      await this.#removeQuestionUseCase.execute(req.params.id, req.params.questionId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
