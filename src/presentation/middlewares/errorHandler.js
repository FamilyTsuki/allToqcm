import { EntityNotFoundError } from '../../domain/errors/EntityNotFoundError.js';
import { ValidationError } from '../../domain/errors/ValidationError.js';
import { DomainError } from '../../domain/errors/DomainError.js';

export function errorHandler(err, _req, res, _next) {
  if (err instanceof EntityNotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }

  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message, details: err.details });
    return;
  }

  if (err instanceof DomainError) {
    res.status(422).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}
