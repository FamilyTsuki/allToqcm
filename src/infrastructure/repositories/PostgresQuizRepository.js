import { QuizRepository } from '../../domain/repositories/QuizRepository.js';

export class PostgresQuizRepository extends QuizRepository {
  #db;

  constructor(db) {
    super();
    this.#db = db;
  }

  async save(_quiz) {
    throw new Error('Method not implemented');
  }

  async findById(_id) {
    throw new Error('Method not implemented');
  }

  async findAll() {
    throw new Error('Method not implemented');
  }

  async update(_quiz) {
    throw new Error('Method not implemented');
  }

  async delete(_id) {
    throw new Error('Method not implemented');
  }
}

