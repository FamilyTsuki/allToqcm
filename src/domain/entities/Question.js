import { ValidationError } from '../errors/ValidationError.js';
import { Option } from './Option.js';
import crypto from 'node:crypto';

export const QUESTION_TYPES = Object.freeze({
  SCALE: 'scale',
  RANKING: 'ranking',
  CHOICE: 'choice',
  MULTIPLE_CHOICE: 'multiple_choice',
});

const DEFAULT_OPTIONS = Object.freeze([
  "Pas du tout d'accord",
  "Plutôt pas d'accord",
  'Neutre / Sans avis',
  "Plutôt d'accord",
  "Tout à fait d'accord",
]);

export class Question {
  #id;
  #surveyId;
  #text;
  #options;
  #imageUrl;
  #type;

  constructor(
    id = crypto.randomUUID(),
    surveyId,
    text,
    options = null,
    imageUrl = null,
    type = QUESTION_TYPES.SCALE,
  ) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new ValidationError('Question text cannot be empty');
    }

    this.#id = id;
    this.#surveyId = surveyId;
    this.#text = text.trim();
    this.#options = [];
    this.#imageUrl = imageUrl ? imageUrl.trim() : null;

    const validTypes = Object.values(QUESTION_TYPES);
    this.#type = validTypes.includes(type) ? type : QUESTION_TYPES.SCALE;

    const initialOptions =
      options === null || options === undefined
        ? this.#type === QUESTION_TYPES.SCALE
          ? DEFAULT_OPTIONS
          : []
        : options;

    for (const option of initialOptions) {
      this.addOption(option);
    }
  }

  get id() {
    return this.#id;
  }

  get surveyId() {
    return this.#surveyId;
  }

  get text() {
    return this.#text;
  }

  get options() {
    return [...this.#options];
  }

  get imageUrl() {
    return this.#imageUrl;
  }

  get type() {
    return this.#type;
  }

  addOption(option) {
    if (!option) {
      throw new ValidationError('Option cannot be empty');
    }

    if (typeof option === 'string') {
      this.#options.push(new Option(undefined, option));
      return;
    }

    const optionEntity = option instanceof Option ? option : new Option(option.id, option.text);

    this.#options.push(optionEntity);
  }

  removeOption(optionId) {
    this.#options = this.#options.filter((opt) => opt.id !== optionId);
  }

  toJSON() {
    return {
      id: this.#id,
      surveyId: this.#surveyId,
      text: this.#text,
      options: this.#options.map((opt) => opt.toJSON()),
      imageUrl: this.#imageUrl,
      type: this.#type,
    };
  }
}
