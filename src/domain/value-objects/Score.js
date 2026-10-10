import { ValidationError } from '../errors/ValidationError.js';

export class Score {
  #pointsEarned;
  #totalPoints;

  constructor(pointsEarned, totalPoints) {
    if (typeof pointsEarned !== 'number' || pointsEarned < 0) {
      throw new ValidationError('Points earned must be a non-negative number');
    }
    if (typeof totalPoints !== 'number' || totalPoints <= 0) {
      throw new ValidationError('Total points must be a positive number');
    }
    if (pointsEarned > totalPoints) {
      throw new ValidationError('Points earned cannot exceed total points');
    }

    this.#pointsEarned = pointsEarned;
    this.#totalPoints = totalPoints;
    Object.freeze(this);
  }

  get pointsEarned() {
    return this.#pointsEarned;
  }

  get totalPoints() {
    return this.#totalPoints;
  }

  get percentage() {
    return Math.round((this.#pointsEarned / this.#totalPoints) * 10000) / 100;
  }

  isPassing(minimumPassingPercentage = 50) {
    return this.percentage >= minimumPassingPercentage;
  }

  equals(otherScore) {
    if (!(otherScore instanceof Score)) {
      return false;
    }
    return (
      this.#pointsEarned === otherScore.pointsEarned && this.#totalPoints === otherScore.totalPoints
    );
  }

  toJSON() {
    return {
      pointsEarned: this.#pointsEarned,
      totalPoints: this.#totalPoints,
      percentage: this.percentage,
    };
  }
}
