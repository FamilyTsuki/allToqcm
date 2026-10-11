import test from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler } from '../src/presentation/middlewares/errorHandler.js';
import { SurveyCreatorController } from '../src/presentation/controllers/SurveyCreatorController.js';
import { SurveyRespondentController } from '../src/presentation/controllers/SurveyRespondentController.js';
import { EntityNotFoundError } from '../src/domain/errors/EntityNotFoundError.js';
import { ValidationError } from '../src/domain/errors/ValidationError.js';
import { DomainError } from '../src/domain/errors/DomainError.js';
import { Survey } from '../src/domain/entities/Survey.js';
import { Question } from '../src/domain/entities/Question.js';
import { SurveyResponse } from '../src/domain/entities/SurveyResponse.js';
import { SurveyCsvPresenter } from '../src/presentation/presenters/SurveyCsvPresenter.js';

function createMockResponse() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
  };
}

test('errorHandler translates EntityNotFoundError to 404', () => {
  const err = new EntityNotFoundError('Survey', 'id-123');
  const res = createMockResponse();
  let nextCalled = false;

  errorHandler(err, {}, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, 'Survey with identifier "id-123" was not found');
  assert.equal(nextCalled, false);
});

test('errorHandler translates ValidationError to 400 with details', () => {
  const err = new ValidationError('Titre requis', { field: 'title' });
  const res = createMockResponse();

  errorHandler(err, {}, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'Titre requis');
  assert.deepEqual(res.body.details, { field: 'title' });
});

test('errorHandler translates DomainError to 422', () => {
  const err = new DomainError('Incohérence métier');
  const res = createMockResponse();

  errorHandler(err, {}, res, () => {});

  assert.equal(res.statusCode, 422);
  assert.equal(res.body.error, 'Incohérence métier');
});

test('errorHandler translates generic Error to 500', () => {
  const err = new Error('Panne inattendue');
  const res = createMockResponse();

  errorHandler(err, {}, res, () => {});

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, 'Internal server error');
});

test('SurveyCreatorController createSurvey responds with 201 and QR Code', async () => {
  const mockSurvey = new Survey('s-new', 'Sondage Produit', 'Desc');
  mockSurvey.addQuestion(new Question('q-1', 's-new', 'Question 1'));

  const controller = new SurveyCreatorController({
    createSurveyUseCase: { execute: async () => mockSurvey },
    qrCodeService: { generateDataUrl: async () => 'data:image/png;base64,mockqr' },
    runnerPort: 3002,
  });

  const req = {
    protocol: 'http',
    hostname: 'testserver.local',
    body: { title: 'Sondage Produit', questions: [{ text: 'Question 1' }] },
  };
  const res = createMockResponse();

  await controller.createSurvey(req, res, () => {});

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.id, 's-new');
  assert.equal(res.body.title, 'Sondage Produit');
  assert.equal(res.body.qrCode, 'data:image/png;base64,mockqr');
  assert.ok(res.body.shareUrl.includes('testserver.local:3002/?survey=s-new'));
});

test('SurveyCreatorController createSurvey forwards error to next', async () => {
  const controller = new SurveyCreatorController({
    createSurveyUseCase: {
      execute: async () => {
        throw new ValidationError('Erreur de validation');
      },
    },
  });

  let forwardedError = null;
  await controller.createSurvey(
    { body: {} },
    createMockResponse(),
    (err) => (forwardedError = err),
  );

  assert.ok(forwardedError instanceof ValidationError);
});

test('SurveyCreatorController listSurveys responds with 200 and surveys array', async () => {
  const survey1 = new Survey('s-1', 'Premier');
  const survey2 = new Survey('s-2', 'Deuxième');

  const controller = new SurveyCreatorController({
    listSurveysUseCase: { execute: async () => [survey1, survey2] },
  });

  const res = createMockResponse();
  await controller.listSurveys({}, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 2);
  assert.equal(res.body[0].title, 'Premier');
  assert.equal(res.body[1].title, 'Deuxième');
});

test('SurveyCreatorController getSurveyById responds with 200', async () => {
  const survey = new Survey('s-view', 'Détail');
  const controller = new SurveyCreatorController({
    getSurveyByIdUseCase: { execute: async () => survey },
  });

  const req = { params: { id: 's-view' } };
  const res = createMockResponse();
  await controller.getSurveyById(req, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.id, 's-view');
});

test('SurveyCreatorController deleteSurvey responds with 204', async () => {
  let deletedId = null;
  const controller = new SurveyCreatorController({
    deleteSurveyUseCase: {
      execute: async (id) => {
        deletedId = id;
      },
    },
  });

  const req = { params: { id: 's-delete' } };
  const res = createMockResponse();
  await controller.deleteSurvey(req, res, () => {});

  assert.equal(res.statusCode, 204);
  assert.equal(deletedId, 's-delete');
});

test('SurveyCreatorController getSurveyStats responds with 200 and stats', async () => {
  const statsData = {
    survey: { id: 's-stats', title: 'Stats Test' },
    totalResponses: 10,
    globalAverageScore: 4.2,
    questions: [],
  };

  const controller = new SurveyCreatorController({
    getSurveyStatsUseCase: { execute: async () => statsData },
  });

  const res = createMockResponse();
  await controller.getSurveyStats({ params: { id: 's-stats' } }, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.totalResponses, 10);
  assert.equal(res.body.globalAverageScore, 4.2);
});

test('SurveyCreatorController getSurveyShare supports custom color query', async () => {
  const survey = new Survey('s-share', 'Partage');
  let requestedColor = null;

  const controller = new SurveyCreatorController({
    getSurveyByIdUseCase: { execute: async () => survey },
    qrCodeService: {
      generateDataUrl: async (_url, opts) => {
        requestedColor = opts?.color?.dark;
        return 'data:image/png;base64,custom-qr';
      },
    },
    runnerPort: 3002,
  });

  const req = {
    protocol: 'http',
    hostname: 'localhost',
    params: { id: 's-share' },
    query: { color: '#8b5cf6' },
  };
  const res = createMockResponse();

  await controller.getSurveyShare(req, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.color, '#8b5cf6');
  assert.equal(requestedColor, '#8b5cf6');
  assert.equal(res.body.qrCode, 'data:image/png;base64,custom-qr');
});

test('SurveyCreatorController toggleStatus responds with 200', async () => {
  const toggledSurvey = new Survey('s-tog', 'Statut', '', [], new Date(), true);
  const controller = new SurveyCreatorController({
    toggleSurveyStatusUseCase: { execute: async () => toggledSurvey },
  });

  const res = createMockResponse();
  await controller.toggleStatus({ params: { id: 's-tog' } }, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.isClosed, true);
});

test('SurveyCreatorController duplicateSurvey responds with 201', async () => {
  const duplicate = new Survey('s-copy', '[Copie] Titre');
  const controller = new SurveyCreatorController({
    duplicateSurveyUseCase: { execute: async () => duplicate },
  });

  const res = createMockResponse();
  await controller.duplicateSurvey({ params: { id: 's-orig' } }, res, () => {});

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.title, '[Copie] Titre');
});

test('SurveyCreatorController exportCsv formats valid CSV with UTF-8 BOM', async () => {
  const stats = {
    survey: { id: 's-csv' },
    questions: [
      {
        text: 'Qualité du service',
        options: [
          { text: 'Très bien', votes: 5, percentage: 50 },
          { text: 'Passable', votes: 5, percentage: 50 },
        ],
      },
    ],
  };

  const controller = new SurveyCreatorController({
    getSurveyStatsUseCase: { execute: async () => stats },
  });

  const res = createMockResponse();
  await controller.exportCsv({ params: { id: 's-csv' } }, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'text/csv; charset=utf-8');
  assert.ok(res.headers['Content-Disposition'].includes('resultats-s-csv.csv'));
  assert.ok(res.body.startsWith('\uFEFF'));
  assert.ok(res.body.includes('"Qualité du service";"Très bien";5;50%'));
});

test('SurveyCreatorController compareSurveys responds with 200 and comparison data', async () => {
  const mockComparison = {
    surveyA: { id: 'a', title: 'T1' },
    surveyB: { id: 'b', title: 'T2' },
    deltaResponses: 5,
    deltaGlobalScore: 0.8,
    comparisons: [],
  };

  const controller = new SurveyCreatorController({
    compareSurveysUseCase: { execute: async () => mockComparison },
  });

  const req = { query: { a: 'a', b: 'b' } };
  const res = createMockResponse();
  await controller.compareSurveys(req, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.deltaResponses, 5);
  assert.equal(res.body.deltaGlobalScore, 0.8);
});

test('SurveyRespondentController listSurveys includes questionCount', async () => {
  const survey = new Survey('s-resp-list', 'Questionnaire Ouvert');
  survey.addQuestion(new Question('q-1', 's-resp-list', 'Q1'));
  survey.addQuestion(new Question('q-2', 's-resp-list', 'Q2'));

  const controller = new SurveyRespondentController({
    listSurveysUseCase: { execute: async () => [survey] },
  });

  const res = createMockResponse();
  await controller.listSurveys({}, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].questionCount, 2);
});

test('SurveyRespondentController getSurvey responds with 200 and survey', async () => {
  const survey = new Survey('s-resp-view', 'Détail Répondant');
  const controller = new SurveyRespondentController({
    getSurveyByIdUseCase: { execute: async () => survey },
  });

  const res = createMockResponse();
  await controller.getSurvey({ params: { id: 's-resp-view' } }, res, () => {});

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.id, 's-resp-view');
});

test('SurveyRespondentController submitResponse responds with 201', async () => {
  const recordedResponse = new SurveyResponse('r-1', 's-1', 'Arthur');
  const controller = new SurveyRespondentController({
    submitSurveyResponseUseCase: { execute: async () => recordedResponse },
  });

  const req = {
    params: { id: 's-1' },
    body: {
      participantName: 'Arthur',
      answers: [{ questionId: 'q-1', selectedOptionIds: ['opt-1'] }],
    },
  };
  const res = createMockResponse();

  await controller.submitResponse(req, res, () => {});

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.participantName, 'Arthur');
});

test('SurveyRespondentController submitResponse forwards error to next', async () => {
  const controller = new SurveyRespondentController({
    submitSurveyResponseUseCase: {
      execute: async () => {
        throw new ValidationError('Questionnaire fermé');
      },
    },
  });

  let capturedError = null;
  const req = { params: { id: 's-closed' }, body: {} };
  await controller.submitResponse(req, createMockResponse(), (err) => (capturedError = err));

  assert.ok(capturedError instanceof ValidationError);
  assert.equal(capturedError.message, 'Questionnaire fermé');
});

test('SurveyCreatorController helpers buildShareUrl and getLocalIp behave reliably', () => {
  const controller = new SurveyCreatorController({ runnerPort: 3002 });
  const ip = controller.getLocalIp();
  assert.ok(ip === null || typeof ip === 'string');

  const shareUrl = controller.buildShareUrl(
    { protocol: 'http', hostname: 'my-custom-domain.com' },
    'survey-999',
  );
  assert.ok(shareUrl.startsWith('http://'));
  assert.ok(shareUrl.includes(':3002/?survey=survey-999'));

  process.env.PUBLIC_RUNNER_URL = 'https://vote.monpi.local';
  const customRunnerUrl = controller.buildShareUrl({ protocol: 'http', hostname: 'localhost' }, 'survey-abc');
  assert.equal(customRunnerUrl, 'https://vote.monpi.local/?survey=survey-abc');
  delete process.env.PUBLIC_RUNNER_URL;

  process.env.PUBLIC_HOST = '192.168.1.100';
  const customHostUrl = controller.buildShareUrl({ protocol: 'http', hostname: 'localhost' }, 'survey-def');
  assert.equal(customHostUrl, 'http://192.168.1.100:3002/?survey=survey-def');
  delete process.env.PUBLIC_HOST;
});

test('SurveyCreatorController toggleStatus forwards error to next', async () => {
  const controller = new SurveyCreatorController({
    toggleSurveyStatusUseCase: {
      execute: async () => {
        throw new EntityNotFoundError('Survey', 's-none');
      },
    },
  });

  let captured = null;
  await controller.toggleStatus(
    { params: { id: 's-none' } },
    createMockResponse(),
    (err) => (captured = err),
  );
  assert.ok(captured instanceof EntityNotFoundError);
});

test('SurveyCreatorController compareSurveys forwards error to next', async () => {
  const controller = new SurveyCreatorController({
    compareSurveysUseCase: {
      execute: async () => {
        throw new Error('Comparaison impossible');
      },
    },
  });

  let captured = null;
  await controller.compareSurveys(
    { query: { a: 'a', b: 'b' } },
    createMockResponse(),
    (err) => (captured = err),
  );
  assert.ok(captured instanceof Error);
});

test('SurveyCsvPresenter toCsv generates formatted CSV string with BOM', () => {
  const stats = {
    survey: { id: 's-pres-1' },
    questions: [
      {
        text: 'Votre avis',
        options: [
          { text: 'Option A', votes: 10, percentage: 80 },
          { text: 'Option B', votes: 2, percentage: 20 },
        ],
      },
    ],
  };

  const csv = SurveyCsvPresenter.toCsv(stats);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('Question;Option;Votes;Pourcentage'));
  assert.ok(csv.includes('"Votre avis";"Option A";10;80%'));
  assert.ok(csv.includes('"Votre avis";"Option B";2;20%'));
});

test('SurveyCsvPresenter toCsv escapes double quotes in labels', () => {
  const stats = {
    survey: { id: 's-pres-2' },
    questions: [
      {
        text: 'Avez-vous lu le livre "Clean Code" ?',
        options: [{ text: 'Oui, "absolument"', votes: 7, percentage: 100 }],
      },
    ],
  };

  const csv = SurveyCsvPresenter.toCsv(stats);
  assert.ok(csv.includes('"Avez-vous lu le livre ""Clean Code"" ?";"Oui, ""absolument""";7;100%'));
});
