import { DatabaseConnection } from '../infrastructure/database/DatabaseConnection.js';
import { PostgresSurveyRepository } from '../infrastructure/repositories/PostgresSurveyRepository.js';
import { PostgresSurveyResponseRepository } from '../infrastructure/repositories/PostgresSurveyResponseRepository.js';
import { CreateSurveyUseCase } from '../application/use-cases/survey/CreateSurveyUseCase.js';
import { GetSurveyByIdUseCase } from '../application/use-cases/survey/GetSurveyByIdUseCase.js';
import { ListSurveysUseCase } from '../application/use-cases/survey/ListSurveysUseCase.js';
import { DeleteSurveyUseCase } from '../application/use-cases/survey/DeleteSurveyUseCase.js';
import { GetSurveyStatsUseCase } from '../application/use-cases/survey/GetSurveyStatsUseCase.js';
import { ToggleSurveyStatusUseCase } from '../application/use-cases/survey/ToggleSurveyStatusUseCase.js';
import { DuplicateSurveyUseCase } from '../application/use-cases/survey/DuplicateSurveyUseCase.js';
import { CompareSurveysUseCase } from '../application/use-cases/survey/CompareSurveysUseCase.js';
import { SubmitSurveyResponseUseCase } from '../application/use-cases/response/SubmitSurveyResponseUseCase.js';
import { QRCodeService } from '../infrastructure/services/QRCodeService.js';
import { SurveyCreatorController } from '../presentation/controllers/SurveyCreatorController.js';
import { SurveyRespondentController } from '../presentation/controllers/SurveyRespondentController.js';
import { createCreatorRouter } from '../presentation/routes/creatorRoutes.js';
import { createRespondentRouter } from '../presentation/routes/respondentRoutes.js';
import { errorHandler } from '../presentation/middlewares/errorHandler.js';
import { Server } from '../infrastructure/http/Server.js';

export class Container {
  #databaseConnection;
  #surveyRepository;
  #surveyResponseRepository;
  #qrCodeService;
  #surveyCreatorController;
  #surveyRespondentController;
  #creatorServer;
  #runnerServer;

  constructor(config = {}) {
    this.#databaseConnection = new DatabaseConnection(config.database);
    this.#surveyRepository = new PostgresSurveyRepository(this.#databaseConnection);
    this.#surveyResponseRepository = new PostgresSurveyResponseRepository(this.#databaseConnection);
    this.#qrCodeService = new QRCodeService();

    const createSurveyUseCase = new CreateSurveyUseCase(this.#surveyRepository);
    const getSurveyByIdUseCase = new GetSurveyByIdUseCase(this.#surveyRepository);
    const listSurveysUseCase = new ListSurveysUseCase(this.#surveyRepository);
    const deleteSurveyUseCase = new DeleteSurveyUseCase(this.#surveyRepository);
    const getSurveyStatsUseCase = new GetSurveyStatsUseCase(
      this.#surveyRepository,
      this.#surveyResponseRepository,
    );
    const toggleSurveyStatusUseCase = new ToggleSurveyStatusUseCase(this.#surveyRepository);
    const duplicateSurveyUseCase = new DuplicateSurveyUseCase(this.#surveyRepository);
    const compareSurveysUseCase = new CompareSurveysUseCase(getSurveyStatsUseCase);

    const submitSurveyResponseUseCase = new SubmitSurveyResponseUseCase(
      this.#surveyRepository,
      this.#surveyResponseRepository,
    );

    const creatorPort = config.creatorPort || process.env.CREATOR_PORT || 3001;
    const runnerPort = config.runnerPort || process.env.RUNNER_PORT || 3002;

    this.#surveyCreatorController = new SurveyCreatorController({
      createSurveyUseCase,
      listSurveysUseCase,
      getSurveyByIdUseCase,
      deleteSurveyUseCase,
      getSurveyStatsUseCase,
      toggleSurveyStatusUseCase,
      duplicateSurveyUseCase,
      compareSurveysUseCase,
      qrCodeService: this.#qrCodeService,
      runnerPort,
    });

    this.#surveyRespondentController = new SurveyRespondentController({
      listSurveysUseCase,
      getSurveyByIdUseCase,
      submitSurveyResponseUseCase,
    });

    const creatorRoutes = [
      {
        path: '/api',
        router: createCreatorRouter(this.#surveyCreatorController),
      },
    ];

    const runnerRoutes = [
      {
        path: '/api',
        router: createRespondentRouter(this.#surveyRespondentController),
      },
    ];

    this.#creatorServer = new Server(creatorPort, creatorRoutes, errorHandler, 'public/creator');
    this.#runnerServer = new Server(runnerPort, runnerRoutes, errorHandler, 'public/runner');
  }

  get databaseConnection() {
    return this.#databaseConnection;
  }

  get surveyRepository() {
    return this.#surveyRepository;
  }

  get surveyResponseRepository() {
    return this.#surveyResponseRepository;
  }

  get qrCodeService() {
    return this.#qrCodeService;
  }

  get surveyCreatorController() {
    return this.#surveyCreatorController;
  }

  get surveyRespondentController() {
    return this.#surveyRespondentController;
  }

  get creatorServer() {
    return this.#creatorServer;
  }

  get runnerServer() {
    return this.#runnerServer;
  }

  get server() {
    return this.#creatorServer;
  }
}
