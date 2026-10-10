import { ValidationError } from '../errors/ValidationError.js';
import { Score } from '../value-objects/Score.js';
import { AttemptAnswer } from './AttemptAnswer.js';
import crypto from 'node:crypto';

export class QuizAttempt {
  #id;
  #quizId;
  #participantName;
  #answers;
  #score;
  #startedAt;
  #completedAt;

  constructor(
    id = crypto.randomUUID(),
    quizId,
    participantName,
    answers = [],
    score = null,
    startedAt = new Date(),
    completedAt = null,
  ) {
    if (!quizId) {
      throw new ValidationError('Quiz ID is required');
    }
    if (
      !participantName ||
      typeof participantName !== 'string' ||
      participantName.trim().length === 0
    ) {
      throw new ValidationError('Participant name cannot be empty');
    }

    this.#id = id;
    this.#quizId = quizId;
    this.#participantName = participantName.trim();
    this.#answers = [];
    this.#score = score instanceof Score ? score : null;
    this.#startedAt = startedAt instanceof Date ? startedAt : new Date(startedAt);
    this.#completedAt = completedAt
      ? completedAt instanceof Date
        ? completedAt
        : new Date(completedAt)
      : null;

    for (const answer of answers) {
      this.recordAnswer(answer);
    }
  }

  get id() {
    return this.#id;
  }

  get quizId() {
    return this.#quizId;
  }

  get participantName() {
    return this.#participantName;
  }

  get answers() {
    return [...this.#answers];
  }

  get score() {
    return this.#score;
  }

  get startedAt() {
    return this.#startedAt;
  }

  get completedAt() {
    return this.#completedAt;
  }

  get isCompleted() {
    return this.#completedAt !== null;
  }

  recordAnswer(attemptAnswer) {
    if (this.isCompleted) {
      throw new ValidationError('Cannot record answer on a completed quiz attempt');
    }
    const answerEntity =
      attemptAnswer instanceof AttemptAnswer
        ? attemptAnswer
        : new AttemptAnswer(attemptAnswer.questionId, attemptAnswer.selectedOptionIds);

    this.#answers = this.#answers.filter((a) => a.questionId !== answerEntity.questionId);
    this.#answers.push(answerEntity);
  }

  complete(score) {
    if (this.isCompleted) {
      throw new ValidationError('Quiz attempt is already completed');
    }
    if (!(score instanceof Score)) {
      throw new ValidationError('A valid Score instance is required to complete attempt');
    }
    this.#score = score;
    this.#completedAt = new Date();
  }

  toJSON() {
    return {
      id: this.#id,
      quizId: this.#quizId,
      participantName: this.#participantName,
      answers: this.#answers.map((a) => a.toJSON()),
      score: this.#score ? this.#score.toJSON() : null,
      startedAt: this.#startedAt.toISOString(),
      completedAt: this.#completedAt ? this.#completedAt.toISOString() : null,
      isCompleted: this.isCompleted,
    };
  }
}
