import { QuizAttemptRepository } from '../../domain/repositories/QuizAttemptRepository.js';

export class PostgresQuizAttemptRepository extends QuizAttemptRepository {
  #db;

  constructor(db) {
    super();
    this.#db = db;
  }

  async save(_quizAttempt) {
    throw new Error('Method not implemented');
  }

  async findById(_id) {
    throw new Error('Method not implemented');
  }

  async findByQuizId(_quizId) {
    throw new Error('Method not implemented');
  }

  async update(_quizAttempt) {
    throw new Error('Method not implemented');
  }
}

