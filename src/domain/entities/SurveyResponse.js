import { ValidationError } from '../errors/ValidationError.js';
import { SurveyAnswer } from './SurveyAnswer.js';
import crypto from 'node:crypto';

export class SurveyResponse {
  #id;
  #surveyId;
  #participantName;
  #answers;
  #submittedAt;

  constructor(
    id = crypto.randomUUID(),
    surveyId,
    participantName = 'Anonyme',
    answers = [],
    submittedAt = new Date(),
  ) {
    if (!surveyId) {
      throw new ValidationError('Survey ID is required');
    }

    this.#id = id;
    this.#surveyId = surveyId;
    this.#participantName =
      participantName && participantName.trim().length > 0 ? participantName.trim() : 'Anonyme';
    this.#answers = [];
    this.#submittedAt = submittedAt instanceof Date ? submittedAt : new Date(submittedAt);

    for (const answer of answers) {
      this.recordAnswer(answer);
    }
  }

  get id() {
    return this.#id;
  }

  get surveyId() {
    return this.#surveyId;
  }

  get participantName() {
    return this.#participantName;
  }

  get answers() {
    return [...this.#answers];
  }

  get submittedAt() {
    return this.#submittedAt;
  }

  recordAnswer(answer) {
    const answerEntity =
      answer instanceof SurveyAnswer
        ? answer
        : new SurveyAnswer(answer.questionId, answer.selectedOptionIds);

    this.#answers = this.#answers.filter((a) => a.questionId !== answerEntity.questionId);
    this.#answers.push(answerEntity);
  }

  toJSON() {
    return {
      id: this.#id,
      surveyId: this.#surveyId,
      participantName: this.#participantName,
      answers: this.#answers.map((a) => a.toJSON()),
      submittedAt: this.#submittedAt.toISOString(),
    };
  }
}
