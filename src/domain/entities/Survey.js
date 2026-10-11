import { ValidationError } from '../errors/ValidationError.js';
import { Question } from './Question.js';
import crypto from 'node:crypto';

export class Survey {
  #id;
  #title;
  #description;
  #questions;
  #createdAt;
  #isClosed;

  constructor(
    id = crypto.randomUUID(),
    title,
    description = '',
    questions = [],
    createdAt = new Date(),
    isClosed = false,
  ) {
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new ValidationError('Survey title cannot be empty');
    }

    this.#id = id;
    this.#title = title.trim();
    this.#description = description ? description.trim() : '';
    this.#questions = [];
    this.#createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
    this.#isClosed = Boolean(isClosed);

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

  get isClosed() {
    return this.#isClosed;
  }

  close() {
    this.#isClosed = true;
  }

  reopen() {
    this.#isClosed = false;
  }

  toggleStatus() {
    this.#isClosed = !this.#isClosed;
  }

  addQuestion(question) {
    if (typeof question === 'string') {
      this.#questions.push(new Question(undefined, this.#id, question));
      return;
    }

    const questionEntity =
      question instanceof Question
        ? question
        : new Question(
            question.id,
            this.#id,
            question.text,
            question.options,
            question.imageUrl,
            question.type,
          );

    this.#questions.push(questionEntity);
  }

  removeQuestion(questionId) {
    this.#questions = this.#questions.filter((q) => q.id !== questionId);
  }

  validate() {
    if (this.#questions.length === 0) {
      throw new ValidationError('Le questionnaire doit comporter au moins une question');
    }
  }

  toJSON() {
    return {
      id: this.#id,
      title: this.#title,
      description: this.#description,
      questions: this.#questions.map((q) => q.toJSON()),
      isClosed: this.#isClosed,
      createdAt: this.#createdAt.toISOString(),
    };
  }
}
