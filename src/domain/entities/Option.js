import { ValidationError } from '../errors/ValidationError.js';
import crypto from 'node:crypto';

export class Option {
  #id;
  #text;

  constructor(id = crypto.randomUUID(), text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new ValidationError('Option text cannot be empty');
    }

    this.#id = id;
    this.#text = text.trim();
  }

  get id() {
    return this.#id;
  }

  get text() {
    return this.#text;
  }

  toJSON() {
    return {
      id: this.#id,
      text: this.#text,
    };
  }
}
