import { ValidationError } from '../../domain/errors/ValidationError.js';

export class CreateQuizDTO {
  #title;
  #description;
  #questions;

  constructor({ title, description = '', questions = [] }) {
    this.#title = title;
    this.#description = description;
    this.#questions = questions;
  }

  get title() {
    return this.#title;
  }

  get description() {
    return this.#description;
  }

  get questions() {
    return this.#questions;
  }

  static fromJSON(json = {}) {
    return new CreateQuizDTO({
      title: json.title,
      description: json.description,
      questions: json.questions,
    });
  }

  validate() {
    if (!this.#title || typeof this.#title !== 'string' || this.#title.trim().length === 0) {
      throw new ValidationError('Quiz title is required and cannot be empty');
    }

    if (!Array.isArray(this.#questions)) {
      throw new ValidationError('Questions must be an array');
    }

    for (const q of this.#questions) {
      if (!q.text || typeof q.text !== 'string' || q.text.trim().length === 0) {
        throw new ValidationError('Every question must have a non-empty text');
      }

      if (q.points !== undefined && (typeof q.points !== 'number' || q.points <= 0)) {
        throw new ValidationError('Question points must be a positive number');
      }

      if (!Array.isArray(q.options) || q.options.length < 2) {
        throw new ValidationError(`Question "${q.text}" must have at least two options`);
      }

      const hasCorrect = q.options.some((opt) => Boolean(opt.isCorrect));
      if (!hasCorrect) {
        throw new ValidationError(
          `Question "${q.text}" must have at least one correct option`,
        );
      }

      for (const opt of q.options) {
        if (!opt.text || typeof opt.text !== 'string' || opt.text.trim().length === 0) {
          throw new ValidationError('Option text cannot be empty');
        }
      }
    }
  }
}

