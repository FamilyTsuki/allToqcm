export class Option {
  #id;
  #text;
  #isCorrect;

  constructor(_id, _text, _isCorrect) {
    throw new Error('Method not implemented');
  }

  get id() {
    throw new Error('Method not implemented');
  }

  get text() {
    throw new Error('Method not implemented');
  }

  get isCorrect() {
    throw new Error('Method not implemented');
  }

  updateText(_newText) {
    throw new Error('Method not implemented');
  }

  setIsCorrect(_isCorrect) {
    throw new Error('Method not implemented');
  }

  toJSON() {
    throw new Error('Method not implemented');
  }
}

