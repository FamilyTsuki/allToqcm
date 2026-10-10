import { ValidationError } from '../errors/ValidationError.js';
import { Option } from './Option.js';
import crypto from 'node:crypto';

export class Question {
  #id;
  #quizId;
  #text;
  #points;
  #options;

  constructor(id = crypto.randomUUID(), quizId, text, points = 1, options = []) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new ValidationError('Question text cannot be empty');
    }
    if (typeof points !== 'number' || points <= 0) {
      throw new ValidationError('Question points must be a positive number');
    }

    this.#id = id;
    this.#quizId = quizId;
    this.#text = text.trim();
    this.#points = points;
    this.#options = [];

    for (const option of options) {
      this.addOption(option);
    }
  }

  get id() {
    return this.#id;
  }

  get quizId() {
    return this.#quizId;
  }

  get text() {
    return this.#text;
  }

  get points() {
    return this.#points;
  }

  get options() {
    return [...this.#options];
  }

  addOption(option) {
    const optionEntity =
      option instanceof Option ? option : new Option(option.id, option.text, option.isCorrect);

    this.#options.push(optionEntity);
  }

  removeOption(optionId) {
    this.#options = this.#options.filter((opt) => opt.id !== optionId);
  }

  hasCorrectOption() {
    return this.#options.some((opt) => opt.isCorrect);
  }

  getCorrectOptionIds() {
    return this.#options.filter((opt) => opt.isCorrect).map((opt) => opt.id);
  }

  evaluateAnswers(selectedOptionIds = []) {
    const correctIds = this.getCorrectOptionIds();
    if (correctIds.length === 0) {
      return 0;
    }

    const selectedSet = new Set(selectedOptionIds);
    const correctSet = new Set(correctIds);

    if (selectedSet.size !== correctSet.size) {
      return 0;
    }

    for (const id of correctSet) {
      if (!selectedSet.has(id)) {
        return 0;
      }
    }

    return this.#points;
  }

  toJSON() {
    return {
      id: this.#id,
      quizId: this.#quizId,
      text: this.#text,
      points: this.#points,
      options: this.#options.map((opt) => opt.toJSON()),
    };
  }
}
