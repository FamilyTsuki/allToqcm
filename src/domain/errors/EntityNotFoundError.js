import { DomainError } from './DomainError.js';

export class EntityNotFoundError extends DomainError {
  constructor(entityName, identifier) {
    super(`${entityName} with identifier "${identifier}" was not found`);
    this.entityName = entityName;
    this.identifier = identifier;
  }
}

