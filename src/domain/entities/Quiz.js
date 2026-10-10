export class Quiz {
  #id;
  #title;
  #description;
  #questions;
  #createdAt;
  #updatedAt;

  constructor(_id, _title, _description, _questions = [], _createdAt = null, _updatedAt = null) {
    throw new Error('Method not implemented');
  }

  get id() {
    throw new Error('Method not implemented');
  }

  get title() {
    throw new Error('Method not implemented');
  }

  get description() {
    throw new Error('Method not implemented');
  }

  get questions() {
    throw new Error('Method not implemented');
  }

  get createdAt() {
    throw new Error('Method not implemented');
  }

  get updatedAt() {
    throw new Error('Method not implemented');
  }

  get totalPoints() {
    throw new Error('Method not implemented');
  }

  addQuestion(_question) {
    throw new Error('Method not implemented');
  }

  removeQuestion(_questionId) {
    throw new Error('Method not implemented');
  }

  updateDetails(_title, _description) {
    throw new Error('Method not implemented');
  }

  validateCompleteness() {
    throw new Error('Method not implemented');
  }

  toJSON() {
    throw new Error('Method not implemented');
  }
}

