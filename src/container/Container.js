import { DatabaseConnection } from '../infrastructure/database/DatabaseConnection.js';
import { PostgresQuizRepository } from '../infrastructure/repositories/PostgresQuizRepository.js';
import { PostgresQuizAttemptRepository } from '../infrastructure/repositories/PostgresQuizAttemptRepository.js';
import { CreateQuizUseCase } from '../application/use-cases/quiz/CreateQuizUseCase.js';
import { GetQuizByIdUseCase } from '../application/use-cases/quiz/GetQuizByIdUseCase.js';
import { ListQuizzesUseCase } from '../application/use-cases/quiz/ListQuizzesUseCase.js';
import { UpdateQuizUseCase } from '../application/use-cases/quiz/UpdateQuizUseCase.js';
import { DeleteQuizUseCase } from '../application/use-cases/quiz/DeleteQuizUseCase.js';
import { AddQuestionUseCase } from '../application/use-cases/quiz/AddQuestionUseCase.js';
import { RemoveQuestionUseCase } from '../application/use-cases/quiz/RemoveQuestionUseCase.js';
import { StartQuizAttemptUseCase } from '../application/use-cases/attempt/StartQuizAttemptUseCase.js';
import { SubmitQuizAttemptUseCase } from '../application/use-cases/attempt/SubmitQuizAttemptUseCase.js';
import { GetAttemptResultUseCase } from '../application/use-cases/attempt/GetAttemptResultUseCase.js';
import { QuizCreatorController } from '../presentation/controllers/QuizCreatorController.js';
import { QuizRunnerController } from '../presentation/controllers/QuizRunnerController.js';
import { createQuizRouter } from '../presentation/routes/quizRoutes.js';
import { createAttemptRouter } from '../presentation/routes/attemptRoutes.js';
import { errorHandler } from '../presentation/middlewares/errorHandler.js';
import { Server } from '../infrastructure/http/Server.js';

export class Container {
  #databaseConnection;
  #quizRepository;
  #quizAttemptRepository;
  #quizCreatorController;
  #quizRunnerController;
  #server;

  constructor(config = {}) {
    this.#databaseConnection = new DatabaseConnection(config.database);
    this.#quizRepository = new PostgresQuizRepository(this.#databaseConnection);
    this.#quizAttemptRepository = new PostgresQuizAttemptRepository(this.#databaseConnection);

    const createQuizUseCase = new CreateQuizUseCase(this.#quizRepository);
    const getQuizByIdUseCase = new GetQuizByIdUseCase(this.#quizRepository);
    const listQuizzesUseCase = new ListQuizzesUseCase(this.#quizRepository);
    const updateQuizUseCase = new UpdateQuizUseCase(this.#quizRepository);
    const deleteQuizUseCase = new DeleteQuizUseCase(this.#quizRepository);
    const addQuestionUseCase = new AddQuestionUseCase(this.#quizRepository);
    const removeQuestionUseCase = new RemoveQuestionUseCase(this.#quizRepository);

    const startQuizAttemptUseCase = new StartQuizAttemptUseCase(
      this.#quizRepository,
      this.#quizAttemptRepository,
    );
    const submitQuizAttemptUseCase = new SubmitQuizAttemptUseCase(
      this.#quizRepository,
      this.#quizAttemptRepository,
    );
    const getAttemptResultUseCase = new GetAttemptResultUseCase(this.#quizAttemptRepository);

    this.#quizCreatorController = new QuizCreatorController({
      createQuizUseCase,
      getQuizByIdUseCase,
      listQuizzesUseCase,
      updateQuizUseCase,
      deleteQuizUseCase,
      addQuestionUseCase,
      removeQuestionUseCase,
    });

    this.#quizRunnerController = new QuizRunnerController({
      startQuizAttemptUseCase,
      submitQuizAttemptUseCase,
      getAttemptResultUseCase,
    });

    const routes = [
      { path: '/api/quizzes', router: createQuizRouter(this.#quizCreatorController) },
      { path: '/api', router: createAttemptRouter(this.#quizRunnerController) },
    ];

    const port = config.port || process.env.PORT || 3000;
    this.#server = new Server(port, routes, errorHandler);
  }

  get databaseConnection() {
    return this.#databaseConnection;
  }

  get quizRepository() {
    return this.#quizRepository;
  }

  get quizAttemptRepository() {
    return this.#quizAttemptRepository;
  }

  get quizCreatorController() {
    return this.#quizCreatorController;
  }

  get quizRunnerController() {
    return this.#quizRunnerController;
  }

  get server() {
    return this.#server;
  }
}
