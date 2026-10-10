import { ValidationError } from '../errors/ValidationError.js';
import { Question } from './Question.js';
import crypto from 'node:crypto';

export class Quiz {
  #id;
  #title;
  #description;
  #questions;
  #createdAt;
  #updatedAt;

  constructor(
    id = crypto.randomUUID(),
    title,
    description = '',
    questions = [],
    createdAt = new Date(),
    updatedAt = new Date(),
  ) {
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new ValidationError('Quiz title cannot be empty');
    }

    this.#id = id;
    this.#title = title.trim();
    this.#description = description ? description.trim() : '';
    this.#questions = [];
    this.#createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
    this.#updatedAt = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);

    for (const question of questions) {
      this.addQuestion(question);
    }
  }

  get id() {
    return this.#id;
  }

  get title() {
    return this.#title;
  }

  get description() {
    return this.#description;
  }

  get questions() {
    return [...this.#questions];
  }

  get createdAt() {
    return this.#createdAt;
  }

  get updatedAt() {
    return this.#updatedAt;
  }

  get totalPoints() {
    return this.#questions.reduce((total, q) => total + q.points, 0);
  }

  addQuestion(question) {
    const questionEntity =
      question instanceof Question
        ? question
        : new Question(question.id, this.#id, question.text, question.points, question.options);

    this.#questions.push(questionEntity);
    this.#updatedAt = new Date();
  }

  removeQuestion(questionId) {
    this.#questions = this.#questions.filter((q) => q.id !== questionId);
    this.#updatedAt = new Date();
  }

  updateDetails(title, description) {
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new ValidationError('Quiz title cannot be empty');
    }
    this.#title = title.trim();
    this.#description = description ? description.trim() : '';
    this.#updatedAt = new Date();
  }

  validateCompleteness() {
    if (this.#questions.length === 0) {
      throw new ValidationError('Quiz must contain at least one question');
    }
    for (const question of this.#questions) {
      if (question.options.length < 2) {
        throw new ValidationError(`Question "${question.text}" must have at least two options`);
      }
      if (!question.hasCorrectOption()) {
        throw new ValidationError(
          `Question "${question.text}" must have at least one correct option`,
        );
      }
    }
  }

  toJSON() {
    return {
      id: this.#id,
      title: this.#title,
      description: this.#description,
      totalPoints: this.totalPoints,
      questions: this.#questions.map((q) => q.toJSON()),
      createdAt: this.#createdAt.toISOString(),
      updatedAt: this.#updatedAt.toISOString(),
    };
  }
}
