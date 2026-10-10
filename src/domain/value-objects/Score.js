export class Score {
  #pointsEarned;
  #totalPoints;

  constructor(_pointsEarned, _totalPoints) {
    throw new Error('Method not implemented');
  }

  get pointsEarned() {
    throw new Error('Method not implemented');
  }

  get totalPoints() {
    throw new Error('Method not implemented');
  }

  get percentage() {
    throw new Error('Method not implemented');
  }

  isPassing(_minimumPassingPercentage) {
    throw new Error('Method not implemented');
  }

  equals(_otherScore) {
    throw new Error('Method not implemented');
  }
}

