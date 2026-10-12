import test from 'node:test';
import assert from 'node:assert/strict';
import { Option } from '../src/domain/entities/Option.js';
import { Question } from '../src/domain/entities/Question.js';
import { Survey } from '../src/domain/entities/Survey.js';
import { SurveyAnswer } from '../src/domain/entities/SurveyAnswer.js';
import { SurveyResponse } from '../src/domain/entities/SurveyResponse.js';
import { DomainError } from '../src/domain/errors/DomainError.js';
import { ValidationError } from '../src/domain/errors/ValidationError.js';
import { EntityNotFoundError } from '../src/domain/errors/EntityNotFoundError.js';

test('Option encapsulates text and rejects empty strings', () => {
  const option = new Option('opt-1', "Tout à fait d'accord");
  assert.equal(option.id, 'opt-1');
  assert.equal(option.text, "Tout à fait d'accord");

  assert.throws(() => new Option('opt-2', ''), ValidationError);
  assert.throws(() => new Option('opt-2', '   '), ValidationError);
});

test('Option generates UUID by default and trims text', () => {
  const option = new Option(undefined, '   Option avec espaces   ');
  assert.ok(option.id);
  assert.equal(typeof option.id, 'string');
  assert.equal(option.text, 'Option avec espaces');
});

test('Option rejects null, undefined, or non-string text', () => {
  assert.throws(() => new Option('opt-3', null), ValidationError);
  assert.throws(() => new Option('opt-4', undefined), ValidationError);
  assert.throws(() => new Option('opt-5', 12345), ValidationError);
  assert.throws(() => new Option('opt-6', {}), ValidationError);
});

test('Option serializes correctly to JSON', () => {
  const option = new Option('opt-99', 'Neutre');
  assert.deepEqual(option.toJSON(), {
    id: 'opt-99',
    text: 'Neutre',
  });
});

test('Question encapsulates options and rejects invalid inputs', () => {
  const question = new Question('q-1', 's-1', 'Préférez-vous le présentiel ?', [
    new Option('opt-1', 'Oui'),
    new Option('opt-2', 'Non'),
  ]);

  assert.equal(question.text, 'Préférez-vous le présentiel ?');
  assert.equal(question.options.length, 2);

  question.addOption(new Option('opt-3', 'Sans avis'));
  assert.equal(question.options.length, 3);

  question.removeOption('opt-3');
  assert.equal(question.options.length, 2);

  const questionWithImage = new Question(
    'q-img',
    's-1',
    'Votre avis sur ce logo ?',
    null,
    'https://example.com/logo.png',
    'ranking',
  );
  assert.equal(questionWithImage.imageUrl, 'https://example.com/logo.png');
  assert.equal(questionWithImage.type, 'ranking');

  assert.throws(() => new Question('q-2', 's-1', ''), ValidationError);
  assert.throws(() => new Question('q-3', 's-1', '   '), ValidationError);
  assert.throws(() => new Question('q-4', 's-1', null), ValidationError);
  assert.throws(() => new Question('q-5', 's-1', 42), ValidationError);
});

test('Question defaults to 5 standard scale options when options parameter is null', () => {
  const question = new Question('q-default', 's-1', 'Niveau de satisfaction');
  assert.equal(question.options.length, 5);
  assert.equal(question.options[0].text, "Pas du tout d'accord");
  assert.equal(question.options[4].text, "Tout à fait d'accord");
  assert.equal(question.type, 'scale');
});

test('Question defaults to empty options array when type is ranking and options is null', () => {
  const question = new Question('q-rank', 's-1', 'Ordre de préférence', null, null, 'ranking');
  assert.equal(question.options.length, 0);
  assert.equal(question.type, 'ranking');
});

test('Question accepts string options and converts them to Option entities', () => {
  const question = new Question('q-strings', 's-1', 'Choix multiples', [
    'Premier choix',
    'Second choix',
  ]);
  assert.equal(question.options.length, 2);
  assert.equal(question.options[0].text, 'Premier choix');
  assert.equal(question.options[1].text, 'Second choix');
  assert.ok(question.options[0] instanceof Option);
});

test('Question accepts plain objects in addOption', () => {
  const question = new Question('q-add', 's-1', 'Test addOption', []);
  question.addOption('Texte brut');
  question.addOption({ id: 'custom-id', text: 'Objet litéral' });
  question.addOption(new Option('inst-id', 'Instance'));

  assert.equal(question.options.length, 3);
  assert.equal(question.options[0].text, 'Texte brut');
  assert.equal(question.options[1].id, 'custom-id');
  assert.equal(question.options[2].id, 'inst-id');
});

test('Question options getter returns a defensive copy', () => {
  const question = new Question('q-immut', 's-1', 'Immutabilité', ['A', 'B']);
  const opts = question.options;
  opts.push(new Option('fake', 'Fake'));
  assert.equal(question.options.length, 2);
});

test('Question trims text and imageUrl', () => {
  const question = new Question(
    'q-trim',
    's-1',
    '   Question avec espaces   ',
    ['A', 'B'],
    '   https://site.com/image.jpg   ',
  );
  assert.equal(question.text, 'Question avec espaces');
  assert.equal(question.imageUrl, 'https://site.com/image.jpg');
});

test('Question defaults invalid type to scale', () => {
  const question = new Question('q-type', 's-1', 'Type inconnu', ['A', 'B'], null, 'invalid_type');
  assert.equal(question.type, 'scale');
});

test('Question serializes correctly to JSON', () => {
  const question = new Question(
    'q-json',
    's-10',
    'Intitulé JSON',
    ['Choix 1'],
    'https://cdn.test/pic.png',
    'ranking',
  );
  const json = question.toJSON();
  assert.equal(json.id, 'q-json');
  assert.equal(json.surveyId, 's-10');
  assert.equal(json.text, 'Intitulé JSON');
  assert.equal(json.imageUrl, 'https://cdn.test/pic.png');
  assert.equal(json.type, 'ranking');
  assert.equal(json.options.length, 1);
  assert.equal(json.options[0].text, 'Choix 1');
});

test('Survey validates structure and required options', () => {
  const survey = new Survey('s-1', 'Sondage Télétravail', 'Avis des salariés');
  assert.equal(survey.title, 'Sondage Télétravail');

  assert.throws(() => survey.validate(), ValidationError);

  const question = new Question('q-1', survey.id, 'Votre avis ?', [
    new Option('opt-1', 'Favorable'),
    new Option('opt-2', 'Défavorable'),
  ]);

  survey.addQuestion(question);
  assert.doesNotThrow(() => survey.validate());

  assert.equal(survey.isClosed, false);
  survey.close();
  assert.equal(survey.isClosed, true);
  survey.reopen();
  assert.equal(survey.isClosed, false);
  survey.toggleStatus();
  assert.equal(survey.isClosed, true);

  assert.throws(() => new Survey('s-2', ''), ValidationError);
  assert.throws(() => new Survey('s-3', '   '), ValidationError);
  assert.throws(() => new Survey('s-4', null), ValidationError);
  assert.throws(() => new Survey('s-5', undefined), ValidationError);
});

test('Survey generates UUID and handles description trimming', () => {
  const survey = new Survey(
    undefined,
    '   Titre avec espaces   ',
    '   Description avec espaces   ',
  );
  assert.ok(survey.id);
  assert.equal(survey.title, 'Titre avec espaces');
  assert.equal(survey.description, 'Description avec espaces');
  assert.ok(survey.createdAt instanceof Date);
});

test('Survey supports adding questions as strings or raw objects', () => {
  const survey = new Survey('s-mix', 'Test Questions');
  survey.addQuestion('Question string directe');
  survey.addQuestion({
    id: 'q-custom',
    text: 'Question objet',
    options: ['Oui', 'Non'],
    type: 'scale',
  });

  assert.equal(survey.questions.length, 2);
  assert.equal(survey.questions[0].text, 'Question string directe');
  assert.equal(survey.questions[1].id, 'q-custom');
});

test('Survey removeQuestion removes target question', () => {
  const survey = new Survey('s-rem', 'Test Suppression');
  const q1 = new Question('q-1', 's-rem', 'Q1');
  const q2 = new Question('q-2', 's-rem', 'Q2');
  survey.addQuestion(q1);
  survey.addQuestion(q2);
  assert.equal(survey.questions.length, 2);

  survey.removeQuestion('q-1');
  assert.equal(survey.questions.length, 1);
  assert.equal(survey.questions[0].id, 'q-2');
});

test('Survey questions getter returns defensive copy', () => {
  const survey = new Survey('s-def', 'Test Immut');
  survey.addQuestion(new Question('q-1', 's-def', 'Q1'));
  const list = survey.questions;
  list.push(new Question('fake', 's-def', 'Fake'));
  assert.equal(survey.questions.length, 1);
});

test('Survey serializes correctly to JSON', () => {
  const survey = new Survey('s-json', 'Titre', 'Description');
  survey.addQuestion(new Question('q-1', 's-json', 'Q1'));
  const json = survey.toJSON();
  assert.equal(json.id, 's-json');
  assert.equal(json.title, 'Titre');
  assert.equal(json.description, 'Description');
  assert.equal(json.isClosed, false);
  assert.equal(typeof json.createdAt, 'string');
  assert.equal(json.questions.length, 1);
});

test('SurveyAnswer encapsulates questionId and selectedOptionIds', () => {
  const answer = new SurveyAnswer('q-10', ['opt-1', 'opt-2']);
  assert.equal(answer.questionId, 'q-10');
  assert.deepEqual(answer.selectedOptionIds, ['opt-1', 'opt-2']);

  const copy = answer.selectedOptionIds;
  copy.push('opt-3');
  assert.deepEqual(answer.selectedOptionIds, ['opt-1', 'opt-2']);
});

test('SurveyAnswer rejects missing questionId and defaults option IDs', () => {
  assert.throws(() => new SurveyAnswer('', ['opt-1']), ValidationError);
  assert.throws(() => new SurveyAnswer(null, ['opt-1']), ValidationError);
  assert.throws(() => new SurveyAnswer(undefined, ['opt-1']), ValidationError);

  const answerNoOpts = new SurveyAnswer('q-single', null);
  assert.deepEqual(answerNoOpts.selectedOptionIds, []);
});

test('SurveyAnswer serializes correctly to JSON', () => {
  const answer = new SurveyAnswer('q-test', ['opt-a', 'opt-b']);
  assert.deepEqual(answer.toJSON(), {
    questionId: 'q-test',
    selectedOptionIds: ['opt-a', 'opt-b'],
  });
});

test('SurveyResponse captures respondent choices', () => {
  const response = new SurveyResponse('res-1', 's-1', 'Alice');
  assert.equal(response.participantName, 'Alice');

  const answer = new SurveyAnswer('q-1', ['opt-1']);
  response.recordAnswer(answer);

  assert.equal(response.answers.length, 1);
  assert.deepEqual(response.answers[0].selectedOptionIds, ['opt-1']);

  const anonymous = new SurveyResponse('res-2', 's-1', '');
  assert.equal(anonymous.participantName, 'Anonyme');
});

test('SurveyResponse defaults participant name to Anonyme when empty or spaces', () => {
  const resp1 = new SurveyResponse('r-1', 's-1', null);
  const resp2 = new SurveyResponse('r-2', 's-1', undefined);
  const resp3 = new SurveyResponse('r-3', 's-1', '     ');

  assert.equal(resp1.participantName, 'Anonyme');
  assert.equal(resp2.participantName, 'Anonyme');
  assert.equal(resp3.participantName, 'Anonyme');
});

test('SurveyResponse trims participant name', () => {
  const response = new SurveyResponse('r-trim', 's-1', '   Camille   ');
  assert.equal(response.participantName, 'Camille');
});

test('SurveyResponse rejects missing surveyId', () => {
  assert.throws(() => new SurveyResponse('r-err', ''), ValidationError);
  assert.throws(() => new SurveyResponse('r-err', null), ValidationError);
  assert.throws(() => new SurveyResponse('r-err', undefined), ValidationError);
});

test('SurveyResponse recordAnswer replaces existing answer for same questionId', () => {
  const response = new SurveyResponse('r-replace', 's-1', 'Jean');
  response.recordAnswer(new SurveyAnswer('q-1', ['opt-initial']));
  assert.deepEqual(response.answers[0].selectedOptionIds, ['opt-initial']);

  response.recordAnswer(new SurveyAnswer('q-1', ['opt-updated']));
  assert.equal(response.answers.length, 1);
  assert.deepEqual(response.answers[0].selectedOptionIds, ['opt-updated']);

  response.recordAnswer({ questionId: 'q-2', selectedOptionIds: ['opt-2'] });
  assert.equal(response.answers.length, 2);
});

test('SurveyResponse answers getter returns defensive copy', () => {
  const response = new SurveyResponse('r-def', 's-1', 'Hugo');
  response.recordAnswer(new SurveyAnswer('q-1', ['opt-1']));
  const list = response.answers;
  list.push(new SurveyAnswer('fake-q', ['fake-opt']));
  assert.equal(response.answers.length, 1);
});

test('SurveyResponse serializes correctly to JSON', () => {
  const response = new SurveyResponse('r-json', 's-88', 'Marie', [
    new SurveyAnswer('q-1', ['opt-1']),
  ]);
  const json = response.toJSON();
  assert.equal(json.id, 'r-json');
  assert.equal(json.surveyId, 's-88');
  assert.equal(json.participantName, 'Marie');
  assert.equal(json.answers.length, 1);
  assert.equal(typeof json.submittedAt, 'string');
});

test('Domain errors hierarchy and formatting', () => {
  const domainErr = new DomainError('Erreur métier');
  assert.ok(domainErr instanceof Error);
  assert.equal(domainErr.name, 'DomainError');
  assert.equal(domainErr.message, 'Erreur métier');

  const validationErr = new ValidationError('Données invalides', { field: 'title' });
  assert.ok(validationErr instanceof DomainError);
  assert.equal(validationErr.name, 'ValidationError');
  assert.equal(validationErr.message, 'Données invalides');
  assert.deepEqual(validationErr.details, { field: 'title' });

  const notFoundErr = new EntityNotFoundError('Survey', '123-abc');
  assert.ok(notFoundErr instanceof DomainError);
  assert.equal(notFoundErr.name, 'EntityNotFoundError');
  assert.equal(notFoundErr.message, 'Survey with identifier "123-abc" was not found');
  assert.equal(notFoundErr.entityName, 'Survey');
  assert.equal(notFoundErr.identifier, '123-abc');
});

test('Option handles emojis and unicode characters safely', () => {
  const option = new Option('opt-emoji', '👍 Tout à fait d’accord 🎉');
  assert.equal(option.text, '👍 Tout à fait d’accord 🎉');
  assert.equal(option.id, 'opt-emoji');
});

test('Question addOption throws when given invalid option text', () => {
  const question = new Question('q-err-opt', 's-1', 'Intitulé valide');
  assert.throws(() => question.addOption(''), ValidationError);
  assert.throws(() => question.addOption('   '), ValidationError);
  assert.throws(() => question.addOption(null), ValidationError);
});

test('Survey constructor preserves custom createdAt and initial isClosed state', () => {
  const pastDate = new Date('2025-01-01T00:00:00Z');
  const closedSurvey = new Survey('s-past', 'Ancien sondage', '', [], pastDate, true);

  assert.equal(closedSurvey.createdAt.toISOString(), pastDate.toISOString());
  assert.equal(closedSurvey.isClosed, true);

  closedSurvey.reopen();
  assert.equal(closedSurvey.isClosed, false);
});

test('SurveyResponse constructor preserves custom submittedAt timestamp', () => {
  const timestamp = new Date('2026-05-15T10:30:00Z');
  const response = new SurveyResponse('res-time', 's-1', 'Testeur', [], timestamp);

  assert.equal(response.submittedAt.toISOString(), timestamp.toISOString());
});

test('Question supports choice type with custom demographic options', () => {
  const question = new Question(
    'q-gender',
    's-1',
    'Quel est votre genre ?',
    ['Homme', 'Femme', 'Autre'],
    null,
    'choice',
  );
  assert.equal(question.type, 'choice');
  assert.equal(question.options.length, 3);
  assert.equal(question.options[0].text, 'Homme');
  assert.equal(question.options[1].text, 'Femme');
  assert.equal(question.options[2].text, 'Autre');
  assert.equal(question.toJSON().type, 'choice');
});

test('Question supports multiple_choice type with multiple selection options', () => {
  const question = new Question(
    'q-multi',
    's-1',
    'Vos centres d’intérêt',
    ['Sport', 'Musique', 'Cinéma'],
    null,
    'multiple_choice',
  );
  assert.equal(question.type, 'multiple_choice');
  assert.equal(question.options.length, 3);
  assert.equal(question.toJSON().type, 'multiple_choice');
});
