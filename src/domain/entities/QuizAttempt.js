export class QuizAttempt {
  #id;
  #quizId;
  #participantName;
  #answers;
  #score;
  #startedAt;
  #completedAt;

  constructor(
    _id,
    _quizId,
    _participantName,
    _answers = [],
    _score = null,
    _startedAt = null,
    _completedAt = null,
  ) {
    throw new Error('Method not implemented');
  }

  get id() {
    throw new Error('Method not implemented');
  }

  get quizId() {
    throw new Error('Method not implemented');
  }

  get participantName() {
    throw new Error('Method not implemented');
  }

  get answers() {
    throw new Error('Method not implemented');
  }

  get score() {
    throw new Error('Method not implemented');
  }

  get startedAt() {
    throw new Error('Method not implemented');
  }

  get completedAt() {
    throw new Error('Method not implemented');
  }

  get isCompleted() {
    throw new Error('Method not implemented');
  }

  recordAnswer(_attemptAnswer) {
    throw new Error('Method not implemented');
  }

  complete(_score) {
    throw new Error('Method not implemented');
  }

  toJSON() {
    throw new Error('Method not implemented');
  }
}

