export class Container {
  #databaseConnection;
  #quizRepository;
  #quizAttemptRepository;
  #quizCreatorController;
  #quizRunnerController;
  #server;

  constructor(_config = {}) {
    throw new Error('Method not implemented');
  }

  get databaseConnection() {
    throw new Error('Method not implemented');
  }

  get quizRepository() {
    throw new Error('Method not implemented');
  }

  get quizAttemptRepository() {
    throw new Error('Method not implemented');
  }

  get quizCreatorController() {
    throw new Error('Method not implemented');
  }

  get quizRunnerController() {
    throw new Error('Method not implemented');
  }

  get server() {
    throw new Error('Method not implemented');
  }
}

