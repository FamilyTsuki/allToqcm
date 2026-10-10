export class Question {
  #id;
  #quizId;
  #text;
  #points;
  #options;

  constructor(_id, _quizId, _text, _points, _options = []) {
    throw new Error('Method not implemented');
  }

  get id() {
    throw new Error('Method not implemented');
  }

  get quizId() {
    throw new Error('Method not implemented');
  }

  get text() {
    throw new Error('Method not implemented');
  }

  get points() {
    throw new Error('Method not implemented');
  }

  get options() {
    throw new Error('Method not implemented');
  }

  addOption(_option) {
    throw new Error('Method not implemented');
  }

  removeOption(_optionId) {
    throw new Error('Method not implemented');
  }

  hasCorrectOption() {
    throw new Error('Method not implemented');
  }

  getCorrectOptionIds() {
    throw new Error('Method not implemented');
  }

  evaluateAnswers(_selectedOptionIds) {
    throw new Error('Method not implemented');
  }

  toJSON() {
    throw new Error('Method not implemented');
  }
}

