export class AttemptAnswer {
  #questionId;
  #selectedOptionIds;

  constructor(_questionId, _selectedOptionIds = []) {
    throw new Error('Method not implemented');
  }

  get questionId() {
    throw new Error('Method not implemented');
  }

  get selectedOptionIds() {
    throw new Error('Method not implemented');
  }

  toJSON() {
    throw new Error('Method not implemented');
  }
}

