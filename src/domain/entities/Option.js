import { ValidationError } from '../errors/ValidationError.js';
import crypto from 'node:crypto';

export class Option {
  #id;
  #text;
  #isCorrect;

  constructor(id = crypto.randomUUID(), text, isCorrect = false) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new ValidationError('Option text cannot be empty');
    }

    this.#id = id;
    this.#text = text.trim();
    this.#isCorrect = Boolean(isCorrect);
  }

  get id() {
    return this.#id;
  }

  get text() {
    return this.#text;
  }

  get isCorrect() {
    return this.#isCorrect;
  }

  updateText(newText) {
    if (!newText || typeof newText !== 'string' || newText.trim().length === 0) {
      throw new ValidationError('Option text cannot be empty');
    }
    this.#text = newText.trim();
  }

  setIsCorrect(isCorrect) {
    this.#isCorrect = Boolean(isCorrect);
  }

  toJSON() {
    return {
      id: this.#id,
      text: this.#text,
      isCorrect: this.#isCorrect,
    };
  }
}
