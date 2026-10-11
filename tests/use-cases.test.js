import test from 'node:test';
import assert from 'node:assert/strict';
import { SurveyRepository } from '../src/domain/repositories/SurveyRepository.js';
import { SurveyResponseRepository } from '../src/domain/repositories/SurveyResponseRepository.js';
import { CreateSurveyDTO } from '../src/application/dtos/CreateSurveyDTO.js';
import { SubmitResponseDTO } from '../src/application/dtos/SubmitResponseDTO.js';
import { CreateSurveyUseCase } from '../src/application/use-cases/survey/CreateSurveyUseCase.js';
import { GetSurveyByIdUseCase } from '../src/application/use-cases/survey/GetSurveyByIdUseCase.js';
import { ListSurveysUseCase } from '../src/application/use-cases/survey/ListSurveysUseCase.js';
import { DeleteSurveyUseCase } from '../src/application/use-cases/survey/DeleteSurveyUseCase.js';
import { GetSurveyStatsUseCase } from '../src/application/use-cases/survey/GetSurveyStatsUseCase.js';
import { SubmitSurveyResponseUseCase } from '../src/application/use-cases/response/SubmitSurveyResponseUseCase.js';
import { ToggleSurveyStatusUseCase } from '../src/application/use-cases/survey/ToggleSurveyStatusUseCase.js';
import { DuplicateSurveyUseCase } from '../src/application/use-cases/survey/DuplicateSurveyUseCase.js';
import { CompareSurveysUseCase } from '../src/application/use-cases/survey/CompareSurveysUseCase.js';
import { EntityNotFoundError } from '../src/domain/errors/EntityNotFoundError.js';
import { ValidationError } from '../src/domain/errors/ValidationError.js';
import { SurveyResponse } from '../src/domain/entities/SurveyResponse.js';
import { SurveyAnswer } from '../src/domain/entities/SurveyAnswer.js';

class InMemorySurveyRepository extends SurveyRepository {
  #surveys = new Map();

  async save(survey) {
    this.#surveys.set(survey.id, survey);
  }

  async findById(id) {
    return this.#surveys.get(id) || null;
  }

  async findAll() {
    return Array.from(this.#surveys.values());
  }

  async delete(id) {
    this.#surveys.delete(id);
  }
}

class InMemorySurveyResponseRepository extends SurveyResponseRepository {
  #responses = new Map();

  async save(response) {
    this.#responses.set(response.id, response);
  }

  async findById(id) {
    return this.#responses.get(id) || null;
  }

  async findBySurveyId(surveyId) {
    return Array.from(this.#responses.values()).filter((r) => r.surveyId === surveyId);
  }
}

test('Creator use cases manage opinion surveys lifecycle and stats', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const responseRepo = new InMemorySurveyResponseRepository();

  const createUseCase = new CreateSurveyUseCase(surveyRepo);
  const getByIdUseCase = new GetSurveyByIdUseCase(surveyRepo);
  const listUseCase = new ListSurveysUseCase(surveyRepo);
  const deleteUseCase = new DeleteSurveyUseCase(surveyRepo);
  const getStatsUseCase = new GetSurveyStatsUseCase(surveyRepo, responseRepo);
  const submitUseCase = new SubmitSurveyResponseUseCase(surveyRepo, responseRepo);

  const dto = new CreateSurveyDTO({
    title: 'Avis Télétravail',
    description: 'Enquête interne',
    questions: [
      {
        text: 'Quel rythme préférez-vous ?',
        options: [
          { text: '100% télétravail' },
          { text: 'Hybride 2-3 jours' },
          { text: '100% présentiel' },
        ],
      },
    ],
  });

  const createdSurvey = await createUseCase.execute(dto);
  assert.equal(createdSurvey.title, 'Avis Télétravail');
  assert.equal(createdSurvey.questions.length, 1);
  assert.equal(createdSurvey.questions[0].options.length, 3);

  const found = await getByIdUseCase.execute(createdSurvey.id);
  assert.equal(found.id, createdSurvey.id);

  const all = await listUseCase.execute();
  assert.equal(all.length, 1);

  const questionId = createdSurvey.questions[0].id;
  const optionIdHybrid = createdSurvey.questions[0].options[1].id;

  await submitUseCase.execute(
    createdSurvey.id,
    new SubmitResponseDTO({
      participantName: 'Alice',
      answers: [{ questionId, selectedOptionIds: [optionIdHybrid] }],
    }),
  );

  const stats = await getStatsUseCase.execute(createdSurvey.id);
  assert.equal(stats.totalResponses, 1);
  assert.equal(stats.questions[0].options[1].votes, 1);
  assert.equal(stats.questions[0].options[1].percentage, 100);

  await deleteUseCase.execute(createdSurvey.id);
  await assert.rejects(() => getByIdUseCase.execute(createdSurvey.id), EntityNotFoundError);
});

test('CreateSurveyUseCase with image URL and custom ranking question', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const createUseCase = new CreateSurveyUseCase(surveyRepo);

  const dto = new CreateSurveyDTO({
    title: 'Questionnaire Visuel et Classement',
    description: 'Test complet',
    questions: [
      {
        text: 'Que pensez-vous du logo ?',
        imageUrl: 'https://cdn.example.com/logo.png',
        type: 'scale',
      },
      {
        text: 'Priorisez les tâches',
        type: 'ranking',
        options: [{ text: 'Tâche A' }, { text: 'Tâche B' }],
      },
    ],
  });

  const survey = await createUseCase.execute(dto);
  assert.equal(survey.questions.length, 2);
  assert.equal(survey.questions[0].imageUrl, 'https://cdn.example.com/logo.png');
  assert.equal(survey.questions[0].type, 'scale');
  assert.equal(survey.questions[1].type, 'ranking');
  assert.equal(survey.questions[1].options.length, 2);
});

test('CreateSurveyUseCase throws on invalid DTO', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const createUseCase = new CreateSurveyUseCase(surveyRepo);

  const invalidDto = new CreateSurveyDTO({ title: '', questions: [] });
  await assert.rejects(() => createUseCase.execute(invalidDto), ValidationError);
});

test('GetSurveyByIdUseCase throws EntityNotFoundError when survey is missing', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const getByIdUseCase = new GetSurveyByIdUseCase(surveyRepo);

  await assert.rejects(() => getByIdUseCase.execute('id-inexistant'), EntityNotFoundError);
});

test('ListSurveysUseCase returns empty array when repository has no surveys', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const listUseCase = new ListSurveysUseCase(surveyRepo);

  const result = await listUseCase.execute();
  assert.deepEqual(result, []);
});

test('DeleteSurveyUseCase throws EntityNotFoundError when target is missing', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const deleteUseCase = new DeleteSurveyUseCase(surveyRepo);

  await assert.rejects(() => deleteUseCase.execute('not-found'), EntityNotFoundError);
});

test('Creating survey with only question texts automatically generates opinion scale', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const createUseCase = new CreateSurveyUseCase(surveyRepo);

  const dto = new CreateSurveyDTO({
    title: 'Questionnaire Simple',
    questions: [{ text: 'Aimez-vous le chocolat ?' }, { text: 'Trouvez-vous ce système simple ?' }],
  });

  const survey = await createUseCase.execute(dto);
  assert.equal(survey.questions.length, 2);
  assert.equal(survey.questions[0].options.length, 5);
  assert.equal(survey.questions[0].options[0].text, "Pas du tout d'accord");
  assert.equal(survey.questions[0].options[4].text, "Tout à fait d'accord");
});

test('ToggleSurveyStatusUseCase changes survey status and blocks responses when closed', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const responseRepo = new InMemorySurveyResponseRepository();
  const createUseCase = new CreateSurveyUseCase(surveyRepo);
  const toggleUseCase = new ToggleSurveyStatusUseCase(surveyRepo);
  const submitUseCase = new SubmitSurveyResponseUseCase(surveyRepo, responseRepo);

  const survey = await createUseCase.execute(
    new CreateSurveyDTO({
      title: 'Statut Test',
      questions: [{ text: 'Question 1' }],
    }),
  );

  assert.equal(survey.isClosed, false);
  const closedSurvey = await toggleUseCase.execute(survey.id);
  assert.equal(closedSurvey.isClosed, true);

  const questionId = closedSurvey.questions[0].id;
  const optionId = closedSurvey.questions[0].options[0].id;

  await assert.rejects(
    () =>
      submitUseCase.execute(
        closedSurvey.id,
        new SubmitResponseDTO({
          participantName: 'Bob',
          answers: [{ questionId, selectedOptionIds: [optionId] }],
        }),
      ),
    ValidationError,
  );

  const reopenedSurvey = await toggleUseCase.execute(survey.id);
  assert.equal(reopenedSurvey.isClosed, false);
});

test('ToggleSurveyStatusUseCase throws EntityNotFoundError on missing survey', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const toggleUseCase = new ToggleSurveyStatusUseCase(surveyRepo);

  await assert.rejects(() => toggleUseCase.execute('missing-id'), EntityNotFoundError);
});

test('DuplicateSurveyUseCase creates an independent copy of a survey', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const createUseCase = new CreateSurveyUseCase(surveyRepo);
  const duplicateUseCase = new DuplicateSurveyUseCase(surveyRepo);

  const original = await createUseCase.execute(
    new CreateSurveyDTO({
      title: 'Original Title',
      description: 'Original Description',
      questions: [
        {
          text: 'Original Q1',
          imageUrl: 'https://site.com/pic.png',
          type: 'ranking',
          options: [{ text: 'A' }, { text: 'B' }],
        },
        { text: 'Original Q2' },
      ],
    }),
  );

  const duplicated = await duplicateUseCase.execute(original.id);
  assert.notEqual(duplicated.id, original.id);
  assert.equal(duplicated.title, '[Copie] Original Title');
  assert.equal(duplicated.description, 'Original Description');
  assert.equal(duplicated.isClosed, false);
  assert.equal(duplicated.questions.length, 2);
  assert.equal(duplicated.questions[0].text, 'Original Q1');
  assert.equal(duplicated.questions[0].type, 'ranking');
  assert.equal(duplicated.questions[0].imageUrl, 'https://site.com/pic.png');
  assert.notEqual(duplicated.questions[0].id, original.questions[0].id);
  assert.notEqual(duplicated.questions[0].options[0].id, original.questions[0].options[0].id);
});

test('DuplicateSurveyUseCase throws EntityNotFoundError if source is not found', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const duplicateUseCase = new DuplicateSurveyUseCase(surveyRepo);

  await assert.rejects(() => duplicateUseCase.execute('absent-id'), EntityNotFoundError);
});

test('GetSurveyStatsUseCase returns zero statistics when no responses exist', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const responseRepo = new InMemorySurveyResponseRepository();
  const createUseCase = new CreateSurveyUseCase(surveyRepo);
  const getStatsUseCase = new GetSurveyStatsUseCase(surveyRepo, responseRepo);

  const survey = await createUseCase.execute(
    new CreateSurveyDTO({
      title: 'Zéro Réponses',
      questions: [{ text: 'Question vide' }],
    }),
  );

  const stats = await getStatsUseCase.execute(survey.id);
  assert.equal(stats.totalResponses, 0);
  assert.equal(stats.globalAverageScore, 0);
  assert.equal(stats.questions[0].options[0].votes, 0);
  assert.equal(stats.questions[0].options[0].percentage, 0);
});

test('GetSurveyStatsUseCase calculates multi-question average scores accurately', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const responseRepo = new InMemorySurveyResponseRepository();
  const createUseCase = new CreateSurveyUseCase(surveyRepo);
  const submitUseCase = new SubmitSurveyResponseUseCase(surveyRepo, responseRepo);
  const getStatsUseCase = new GetSurveyStatsUseCase(surveyRepo, responseRepo);

  const survey = await createUseCase.execute(
    new CreateSurveyDTO({
      title: 'Évaluation Globale',
      questions: [{ text: 'Question 1' }, { text: 'Question 2' }],
    }),
  );

  const q1 = survey.questions[0];
  const q2 = survey.questions[1];

  await submitUseCase.execute(
    survey.id,
    new SubmitResponseDTO({
      participantName: 'P1',
      answers: [
        { questionId: q1.id, selectedOptionIds: [q1.options[3].id] },
        { questionId: q2.id, selectedOptionIds: [q2.options[4].id] },
      ],
    }),
  );

  await submitUseCase.execute(
    survey.id,
    new SubmitResponseDTO({
      participantName: 'P2',
      answers: [
        { questionId: q1.id, selectedOptionIds: [q1.options[4].id] },
        { questionId: q2.id, selectedOptionIds: [q2.options[4].id] },
      ],
    }),
  );

  const stats = await getStatsUseCase.execute(survey.id);
  assert.equal(stats.totalResponses, 2);
  assert.equal(stats.questions[0].averageScore, 4.5);
  assert.equal(stats.questions[1].averageScore, 5);
  assert.equal(stats.globalAverageScore, 4.8);
});

test('GetSurveyStatsUseCase aggregates ranking questions with Borda count', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const responseRepo = new InMemorySurveyResponseRepository();
  const createUseCase = new CreateSurveyUseCase(surveyRepo);
  const submitUseCase = new SubmitSurveyResponseUseCase(surveyRepo, responseRepo);
  const getStatsUseCase = new GetSurveyStatsUseCase(surveyRepo, responseRepo);

  const survey = await createUseCase.execute(
    new CreateSurveyDTO({
      title: 'Priorités Projet',
      questions: [
        {
          text: 'Classez les chantiers',
          type: 'ranking',
          options: [{ text: 'Sécurité' }, { text: 'Performance' }, { text: 'Design' }],
        },
      ],
    }),
  );

  const q = survey.questions[0];
  const secId = q.options[0].id;
  const perfId = q.options[1].id;
  const designId = q.options[2].id;

  await submitUseCase.execute(
    survey.id,
    new SubmitResponseDTO({
      participantName: 'Alice',
      answers: [{ questionId: q.id, selectedOptionIds: [secId, perfId, designId] }],
    }),
  );

  await submitUseCase.execute(
    survey.id,
    new SubmitResponseDTO({
      participantName: 'Bob',
      answers: [{ questionId: q.id, selectedOptionIds: [secId, designId, perfId] }],
    }),
  );

  const stats = await getStatsUseCase.execute(survey.id);
  assert.equal(stats.totalResponses, 2);
  assert.equal(stats.questions[0].type, 'ranking');
  assert.equal(stats.questions[0].options[0].text, 'Sécurité');
  assert.equal(stats.questions[0].options[0].points, 6);
  assert.equal(stats.questions[0].options[0].averageRank, 1);
});

test('GetSurveyStatsUseCase throws EntityNotFoundError on unknown survey', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const responseRepo = new InMemorySurveyResponseRepository();
  const getStatsUseCase = new GetSurveyStatsUseCase(surveyRepo, responseRepo);

  await assert.rejects(() => getStatsUseCase.execute('inexistant-stats'), EntityNotFoundError);
});

test('CompareSurveysUseCase benchmarks two surveys and outputs deltas', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const responseRepo = new InMemorySurveyResponseRepository();
  const createUseCase = new CreateSurveyUseCase(surveyRepo);
  const submitUseCase = new SubmitSurveyResponseUseCase(surveyRepo, responseRepo);
  const getStatsUseCase = new GetSurveyStatsUseCase(surveyRepo, responseRepo);
  const compareUseCase = new CompareSurveysUseCase(getStatsUseCase);

  const surveyA = await createUseCase.execute(
    new CreateSurveyDTO({
      title: 'Enquête T1',
      questions: [{ text: 'Satisfaction générale' }],
    }),
  );

  const surveyB = await createUseCase.execute(
    new CreateSurveyDTO({
      title: 'Enquête T2',
      questions: [{ text: 'Satisfaction générale' }],
    }),
  );

  const qA = surveyA.questions[0];
  const qB = surveyB.questions[0];

  await submitUseCase.execute(
    surveyA.id,
    new SubmitResponseDTO({
      participantName: 'P1',
      answers: [{ questionId: qA.id, selectedOptionIds: [qA.options[1].id] }],
    }),
  );

  await submitUseCase.execute(
    surveyB.id,
    new SubmitResponseDTO({
      participantName: 'P2',
      answers: [{ questionId: qB.id, selectedOptionIds: [qB.options[4].id] }],
    }),
  );

  const comparison = await compareUseCase.execute(surveyA.id, surveyB.id);
  assert.equal(comparison.totalResponsesA, 1);
  assert.equal(comparison.totalResponsesB, 1);
  assert.equal(comparison.deltaResponses, 0);
  assert.equal(comparison.comparisons.length, 1);
  assert.equal(comparison.comparisons[0].scoreA, 2);
  assert.equal(comparison.comparisons[0].scoreB, 5);
  assert.equal(comparison.comparisons[0].deltaScore, 3);
});

test('CompareSurveysUseCase throws EntityNotFoundError when survey IDs are missing', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const responseRepo = new InMemorySurveyResponseRepository();
  const getStatsUseCase = new GetSurveyStatsUseCase(surveyRepo, responseRepo);
  const compareUseCase = new CompareSurveysUseCase(getStatsUseCase);

  await assert.rejects(() => compareUseCase.execute(null, 'id-b'), EntityNotFoundError);
  await assert.rejects(() => compareUseCase.execute('id-a', ''), EntityNotFoundError);
});

test('CompareSurveysUseCase handles negative deltas and different questions gracefully', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const responseRepo = new InMemorySurveyResponseRepository();
  const createUseCase = new CreateSurveyUseCase(surveyRepo);
  const submitUseCase = new SubmitSurveyResponseUseCase(surveyRepo, responseRepo);
  const getStatsUseCase = new GetSurveyStatsUseCase(surveyRepo, responseRepo);
  const compareUseCase = new CompareSurveysUseCase(getStatsUseCase);

  const surveyA = await createUseCase.execute(
    new CreateSurveyDTO({
      title: 'Campagne Initiale',
      questions: [{ text: 'Question A' }],
    }),
  );

  const surveyB = await createUseCase.execute(
    new CreateSurveyDTO({
      title: 'Campagne Suivante',
      questions: [{ text: 'Question Différente' }],
    }),
  );

  const qA = surveyA.questions[0];

  await submitUseCase.execute(
    surveyA.id,
    new SubmitResponseDTO({
      participantName: 'A1',
      answers: [{ questionId: qA.id, selectedOptionIds: [qA.options[4].id] }],
    }),
  );
  await submitUseCase.execute(
    surveyA.id,
    new SubmitResponseDTO({
      participantName: 'A2',
      answers: [{ questionId: qA.id, selectedOptionIds: [qA.options[4].id] }],
    }),
  );

  const comparison = await compareUseCase.execute(surveyA.id, surveyB.id);
  assert.equal(comparison.totalResponsesA, 2);
  assert.equal(comparison.totalResponsesB, 0);
  assert.equal(comparison.deltaResponses, -2);
  assert.equal(comparison.deltaGlobalScore, -5);
});

test('SubmitSurveyResponseUseCase rejects non-existent survey', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const responseRepo = new InMemorySurveyResponseRepository();
  const submitUseCase = new SubmitSurveyResponseUseCase(surveyRepo, responseRepo);

  const dto = new SubmitResponseDTO({
    answers: [{ questionId: 'q-any', selectedOptionIds: ['opt-any'] }],
  });

  await assert.rejects(() => submitUseCase.execute('missing-survey', dto), EntityNotFoundError);
});

test('SubmitSurveyResponseUseCase records anonymous responses with fallback', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const responseRepo = new InMemorySurveyResponseRepository();
  const createUseCase = new CreateSurveyUseCase(surveyRepo);
  const submitUseCase = new SubmitSurveyResponseUseCase(surveyRepo, responseRepo);

  const survey = await createUseCase.execute(
    new CreateSurveyDTO({
      title: 'Sondage Anonyme',
      questions: [{ text: 'Votre ressenti ?' }],
    }),
  );

  const q = survey.questions[0];
  const response = await submitUseCase.execute(
    survey.id,
    new SubmitResponseDTO({
      participantName: '   ',
      answers: [{ questionId: q.id, selectedOptionIds: [q.options[2].id] }],
    }),
  );

  assert.equal(response.participantName, 'Anonyme');
  assert.equal(response.answers.length, 1);
});

test('SubmitSurveyResponseUseCase records multiple questions responses in single submission', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const responseRepo = new InMemorySurveyResponseRepository();
  const createUseCase = new CreateSurveyUseCase(surveyRepo);
  const submitUseCase = new SubmitSurveyResponseUseCase(surveyRepo, responseRepo);

  const survey = await createUseCase.execute(
    new CreateSurveyDTO({
      title: 'Sondage Multiple',
      questions: [{ text: 'Question A' }, { text: 'Question B' }, { text: 'Question C' }],
    }),
  );

  const [qA, qB, qC] = survey.questions;
  const response = await submitUseCase.execute(
    survey.id,
    new SubmitResponseDTO({
      participantName: 'Maxime',
      answers: [
        { questionId: qA.id, selectedOptionIds: [qA.options[0].id] },
        { questionId: qB.id, selectedOptionIds: [qB.options[1].id] },
        { questionId: qC.id, selectedOptionIds: [qC.options[2].id] },
      ],
    }),
  );

  assert.equal(response.answers.length, 3);
  assert.equal(response.participantName, 'Maxime');
});

test('CompareSurveysUseCase returns zero deltas when comparing survey to itself', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const responseRepo = new InMemorySurveyResponseRepository();
  const createUseCase = new CreateSurveyUseCase(surveyRepo);
  const submitUseCase = new SubmitSurveyResponseUseCase(surveyRepo, responseRepo);
  const getStatsUseCase = new GetSurveyStatsUseCase(surveyRepo, responseRepo);
  const compareUseCase = new CompareSurveysUseCase(getStatsUseCase);

  const survey = await createUseCase.execute(
    new CreateSurveyDTO({
      title: 'Auto Comparaison',
      questions: [{ text: 'Qualité' }],
    }),
  );

  const q = survey.questions[0];
  await submitUseCase.execute(
    survey.id,
    new SubmitResponseDTO({
      participantName: 'User',
      answers: [{ questionId: q.id, selectedOptionIds: [q.options[3].id] }],
    }),
  );

  const comparison = await compareUseCase.execute(survey.id, survey.id);
  assert.equal(comparison.deltaResponses, 0);
  assert.equal(comparison.deltaGlobalScore, 0);
  assert.equal(comparison.comparisons[0].deltaScore, 0);
});

test('DeleteSurveyUseCase isolates deletion and preserves other surveys', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const createUseCase = new CreateSurveyUseCase(surveyRepo);
  const deleteUseCase = new DeleteSurveyUseCase(surveyRepo);
  const listUseCase = new ListSurveysUseCase(surveyRepo);

  const s1 = await createUseCase.execute(new CreateSurveyDTO({ title: 'S1', questions: ['Q1'] }));
  const s2 = await createUseCase.execute(new CreateSurveyDTO({ title: 'S2', questions: ['Q2'] }));

  await deleteUseCase.execute(s1.id);
  const remaining = await listUseCase.execute();

  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, s2.id);
});

test('GetSurveyStatsUseCase ranking question with single response scores points accurately', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const responseRepo = new InMemorySurveyResponseRepository();
  const createUseCase = new CreateSurveyUseCase(surveyRepo);
  const submitUseCase = new SubmitSurveyResponseUseCase(surveyRepo, responseRepo);
  const getStatsUseCase = new GetSurveyStatsUseCase(surveyRepo, responseRepo);

  const survey = await createUseCase.execute(
    new CreateSurveyDTO({
      title: 'Priorités Équipe',
      questions: [
        {
          text: 'Classez ces 3 priorités',
          type: 'ranking',
          options: [{ text: 'Code Review' }, { text: 'Documentation' }, { text: 'Refactoring' }],
        },
      ],
    }),
  );

  const q = survey.questions[0];
  const [optCR, optDoc, optRef] = q.options;

  await submitUseCase.execute(
    survey.id,
    new SubmitResponseDTO({
      participantName: 'Dev',
      answers: [
        {
          questionId: q.id,
          selectedOptionIds: [optRef.id, optCR.id, optDoc.id],
        },
      ],
    }),
  );

  const stats = await getStatsUseCase.execute(survey.id);
  assert.equal(stats.totalResponses, 1);
  assert.equal(stats.questions[0].options[0].id, optRef.id);
  assert.equal(stats.questions[0].options[0].points, 3);
  assert.equal(stats.questions[0].options[0].averageRank, 1);
  assert.equal(stats.questions[0].options[1].id, optCR.id);
  assert.equal(stats.questions[0].options[1].points, 2);
  assert.equal(stats.questions[0].options[1].averageRank, 2);
  assert.equal(stats.questions[0].options[2].id, optDoc.id);
  assert.equal(stats.questions[0].options[2].points, 1);
  assert.equal(stats.questions[0].options[2].averageRank, 3);
});

test('GetSurveyStatsUseCase ignores answers that reference foreign question IDs', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const responseRepo = new InMemorySurveyResponseRepository();
  const createUseCase = new CreateSurveyUseCase(surveyRepo);
  const getStatsUseCase = new GetSurveyStatsUseCase(surveyRepo, responseRepo);

  const survey = await createUseCase.execute(
    new CreateSurveyDTO({
      title: 'Sondage Questions Ciblées',
      questions: [{ text: 'Question légitime' }],
    }),
  );

  const q = survey.questions[0];
  const legacyResponse = new SurveyResponse('res-legacy', survey.id, 'Infiltré', [
    new SurveyAnswer(q.id, [q.options[0].id]),
    new SurveyAnswer('foreign-q-id', ['foreign-opt-id']),
  ]);
  await responseRepo.save(legacyResponse);

  const stats = await getStatsUseCase.execute(survey.id);
  assert.equal(stats.totalResponses, 1);
  assert.equal(stats.questions.length, 1);
  assert.equal(stats.questions[0].options[0].votes, 1);
});

test('SubmitSurveyResponseUseCase rejects answers referencing unknown question or option IDs', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const responseRepo = new InMemorySurveyResponseRepository();
  const createUseCase = new CreateSurveyUseCase(surveyRepo);
  const submitUseCase = new SubmitSurveyResponseUseCase(surveyRepo, responseRepo);

  const survey = await createUseCase.execute(
    new CreateSurveyDTO({
      title: 'Protection des votes',
      questions: [{ text: 'Question légitime' }],
    }),
  );

  const q = survey.questions[0];

  await assert.rejects(
    () =>
      submitUseCase.execute(
        survey.id,
        new SubmitResponseDTO({
          participantName: 'Attaquant',
          answers: [{ questionId: 'unknown-q', selectedOptionIds: [q.options[0].id] }],
        }),
      ),
    ValidationError,
  );

  await assert.rejects(
    () =>
      submitUseCase.execute(
        survey.id,
        new SubmitResponseDTO({
          participantName: 'Attaquant',
          answers: [{ questionId: q.id, selectedOptionIds: ['unknown-opt'] }],
        }),
      ),
    ValidationError,
  );
});

test('GetSurveyStatsUseCase produces coherent stats for mixed question types', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const responseRepo = new InMemorySurveyResponseRepository();
  const createUseCase = new CreateSurveyUseCase(surveyRepo);
  const submitUseCase = new SubmitSurveyResponseUseCase(surveyRepo, responseRepo);
  const getStatsUseCase = new GetSurveyStatsUseCase(surveyRepo, responseRepo);

  const survey = await createUseCase.execute(
    new CreateSurveyDTO({
      title: 'Mixte Échelle et Classement',
      questions: [
        { text: 'Avis sur la vélocité', type: 'scale' },
        {
          text: 'Ordre des sprints',
          type: 'ranking',
          options: [{ text: 'Sprint 1' }, { text: 'Sprint 2' }],
        },
      ],
    }),
  );

  const [qScale, qRank] = survey.questions;
  await submitUseCase.execute(
    survey.id,
    new SubmitResponseDTO({
      participantName: 'Lead',
      answers: [
        { questionId: qScale.id, selectedOptionIds: [qScale.options[3].id] },
        { questionId: qRank.id, selectedOptionIds: [qRank.options[1].id, qRank.options[0].id] },
      ],
    }),
  );

  const stats = await getStatsUseCase.execute(survey.id);
  assert.equal(stats.totalResponses, 1);
  assert.equal(stats.questions[0].type, 'scale');
  assert.equal(stats.questions[0].averageScore, 4);
  assert.equal(stats.questions[1].type, 'ranking');
  assert.equal(stats.questions[1].options[0].id, qRank.options[1].id);
  assert.equal(stats.globalAverageScore, 4);
});

test('ListSurveysUseCase populates questions on all surveys', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const createUseCase = new CreateSurveyUseCase(surveyRepo);
  const listUseCase = new ListSurveysUseCase(surveyRepo);

  await createUseCase.execute(
    new CreateSurveyDTO({
      title: 'Enquête A',
      questions: [{ text: 'Q1' }],
    }),
  );
  await createUseCase.execute(
    new CreateSurveyDTO({
      title: 'Enquête B',
      questions: [{ text: 'Q2' }, { text: 'Q3' }],
    }),
  );

  const all = await listUseCase.execute();
  assert.equal(all.length, 2);
  assert.equal(all[0].questions.length, 1);
  assert.equal(all[1].questions.length, 2);
});

test('SubmitSurveyResponseUseCase preserves ranking option IDs order verbatim', async () => {
  const surveyRepo = new InMemorySurveyRepository();
  const responseRepo = new InMemorySurveyResponseRepository();
  const createUseCase = new CreateSurveyUseCase(surveyRepo);
  const submitUseCase = new SubmitSurveyResponseUseCase(surveyRepo, responseRepo);

  const survey = await createUseCase.execute(
    new CreateSurveyDTO({
      title: 'Ordre Strict',
      questions: [
        {
          text: 'Classement ordonné',
          type: 'ranking',
          options: [{ text: '1' }, { text: '2' }, { text: '3' }],
        },
      ],
    }),
  );

  const q = survey.questions[0];
  const orderedIds = [q.options[2].id, q.options[0].id, q.options[1].id];

  const response = await submitUseCase.execute(
    survey.id,
    new SubmitResponseDTO({
      participantName: 'Participant Rigoureux',
      answers: [{ questionId: q.id, selectedOptionIds: orderedIds }],
    }),
  );

  assert.deepEqual(response.answers[0].selectedOptionIds, orderedIds);
});
