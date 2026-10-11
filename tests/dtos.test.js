import test from 'node:test';
import assert from 'node:assert/strict';
import { CreateSurveyDTO } from '../src/application/dtos/CreateSurveyDTO.js';
import { SubmitResponseDTO } from '../src/application/dtos/SubmitResponseDTO.js';
import { ValidationError } from '../src/domain/errors/ValidationError.js';

test('CreateSurveyDTO holds values and provides getters', () => {
  const dto = new CreateSurveyDTO({
    title: 'Nouveau questionnaire',
    description: 'Une description claire',
    questions: [{ text: 'Question 1' }],
  });

  assert.equal(dto.title, 'Nouveau questionnaire');
  assert.equal(dto.description, 'Une description claire');
  assert.equal(dto.questions.length, 1);
});

test('CreateSurveyDTO fromJSON factory builds instance', () => {
  const json = {
    title: 'Titre JSON',
    description: 'Description JSON',
    questions: [{ text: 'Q1' }, { text: 'Q2' }],
  };

  const dto = CreateSurveyDTO.fromJSON(json);
  assert.equal(dto.title, 'Titre JSON');
  assert.equal(dto.description, 'Description JSON');
  assert.equal(dto.questions.length, 2);

  const emptyDto = CreateSurveyDTO.fromJSON();
  assert.equal(emptyDto.title, undefined);
  assert.equal(emptyDto.description, '');
  assert.deepEqual(emptyDto.questions, []);
});

test('CreateSurveyDTO validate passes on valid inputs', () => {
  const dtoObjectQuestions = new CreateSurveyDTO({
    title: 'Questionnaire Valide',
    questions: [{ text: 'Q1' }, { text: 'Q2' }],
  });
  assert.doesNotThrow(() => dtoObjectQuestions.validate());

  const dtoStringQuestions = new CreateSurveyDTO({
    title: 'Questionnaire Cordial',
    questions: ['Question A', 'Question B'],
  });
  assert.doesNotThrow(() => dtoStringQuestions.validate());
});

test('CreateSurveyDTO validate throws on missing or invalid title', () => {
  const missingTitle = new CreateSurveyDTO({ questions: [{ text: 'Q1' }] });
  assert.throws(() => missingTitle.validate(), ValidationError);

  const emptyTitle = new CreateSurveyDTO({ title: '', questions: [{ text: 'Q1' }] });
  assert.throws(() => emptyTitle.validate(), ValidationError);

  const whitespaceTitle = new CreateSurveyDTO({ title: '     ', questions: [{ text: 'Q1' }] });
  assert.throws(() => whitespaceTitle.validate(), ValidationError);

  const numericTitle = new CreateSurveyDTO({ title: 12345, questions: [{ text: 'Q1' }] });
  assert.throws(() => numericTitle.validate(), ValidationError);

  const nullTitle = new CreateSurveyDTO({ title: null, questions: [{ text: 'Q1' }] });
  assert.throws(() => nullTitle.validate(), ValidationError);
});

test('CreateSurveyDTO validate throws on missing or non-array questions', () => {
  const noQuestions = new CreateSurveyDTO({ title: 'Titre' });
  assert.throws(() => noQuestions.validate(), ValidationError);

  const emptyQuestions = new CreateSurveyDTO({ title: 'Titre', questions: [] });
  assert.throws(() => emptyQuestions.validate(), ValidationError);

  const stringQuestions = new CreateSurveyDTO({ title: 'Titre', questions: 'pas un tableau' });
  assert.throws(() => stringQuestions.validate(), ValidationError);

  const nullQuestions = new CreateSurveyDTO({ title: 'Titre', questions: null });
  assert.throws(() => nullQuestions.validate(), ValidationError);
});

test('CreateSurveyDTO validate throws when a question has empty text', () => {
  const emptyStringQuestion = new CreateSurveyDTO({
    title: 'Titre',
    questions: ['Q1', ''],
  });
  assert.throws(() => emptyStringQuestion.validate(), ValidationError);

  const emptyObjectQuestion = new CreateSurveyDTO({
    title: 'Titre',
    questions: [{ text: 'Q1' }, { text: '' }],
  });
  assert.throws(() => emptyObjectQuestion.validate(), ValidationError);

  const whitespaceQuestion = new CreateSurveyDTO({
    title: 'Titre',
    questions: [{ text: '   ' }],
  });
  assert.throws(() => whitespaceQuestion.validate(), ValidationError);

  const nullQuestionText = new CreateSurveyDTO({
    title: 'Titre',
    questions: [{ text: null }],
  });
  assert.throws(() => nullQuestionText.validate(), ValidationError);

  const nonStringQuestionText = new CreateSurveyDTO({
    title: 'Titre',
    questions: [{ text: 999 }],
  });
  assert.throws(() => nonStringQuestionText.validate(), ValidationError);
});

test('SubmitResponseDTO holds values and provides getters', () => {
  const dto = new SubmitResponseDTO({
    participantName: 'Julien',
    answers: [{ questionId: 'q-1', selectedOptionIds: ['opt-1'] }],
  });

  assert.equal(dto.participantName, 'Julien');
  assert.equal(dto.answers.length, 1);
});

test('SubmitResponseDTO defaults participantName to Anonyme', () => {
  const dto = new SubmitResponseDTO({
    answers: [{ questionId: 'q-1', selectedOptionIds: ['opt-1'] }],
  });
  assert.equal(dto.participantName, 'Anonyme');
});

test('SubmitResponseDTO fromJSON factory builds instance', () => {
  const dto = SubmitResponseDTO.fromJSON({
    participantName: 'Sarah',
    answers: [{ questionId: 'q-10', selectedOptionIds: ['opt-a'] }],
  });
  assert.equal(dto.participantName, 'Sarah');
  assert.equal(dto.answers.length, 1);

  const emptyDto = SubmitResponseDTO.fromJSON();
  assert.equal(emptyDto.participantName, 'Anonyme');
  assert.deepEqual(emptyDto.answers, []);
});

test('SubmitResponseDTO validate passes on valid answers', () => {
  const dto = new SubmitResponseDTO({
    participantName: 'Marc',
    answers: [
      { questionId: 'q-1', selectedOptionIds: ['opt-1'] },
      { questionId: 'q-2', selectedOptionIds: ['opt-a', 'opt-b', 'opt-c'] },
    ],
  });
  assert.doesNotThrow(() => dto.validate());
});

test('SubmitResponseDTO validate throws when answers is not an array', () => {
  const nullAnswers = new SubmitResponseDTO({ answers: null });
  assert.throws(() => nullAnswers.validate(), ValidationError);

  const stringAnswers = new SubmitResponseDTO({ answers: 'invalide' });
  assert.throws(() => stringAnswers.validate(), ValidationError);

  const objectAnswers = new SubmitResponseDTO({ answers: {} });
  assert.throws(() => objectAnswers.validate(), ValidationError);
});

test('SubmitResponseDTO validate throws when an answer lacks questionId', () => {
  const missingQId = new SubmitResponseDTO({
    answers: [{ selectedOptionIds: ['opt-1'] }],
  });
  assert.throws(() => missingQId.validate(), ValidationError);

  const emptyQId = new SubmitResponseDTO({
    answers: [{ questionId: '', selectedOptionIds: ['opt-1'] }],
  });
  assert.throws(() => emptyQId.validate(), ValidationError);
});

test('SubmitResponseDTO validate throws when selectedOptionIds is not an array', () => {
  const missingOpts = new SubmitResponseDTO({
    answers: [{ questionId: 'q-1' }],
  });
  assert.throws(() => missingOpts.validate(), ValidationError);

  const stringOpts = new SubmitResponseDTO({
    answers: [{ questionId: 'q-1', selectedOptionIds: 'opt-1' }],
  });
  assert.throws(() => stringOpts.validate(), ValidationError);

  const nullOpts = new SubmitResponseDTO({
    answers: [{ questionId: 'q-1', selectedOptionIds: null }],
  });
  assert.throws(() => nullOpts.validate(), ValidationError);
});

test('CreateSurveyDTO validate enforces length limits on title, description, and question text', () => {
  const longTitle = 'a'.repeat(201);
  const dtoTitle = new CreateSurveyDTO({ title: longTitle, questions: ['Q1'] });
  assert.throws(() => dtoTitle.validate(), ValidationError);

  const longDesc = 'd'.repeat(2001);
  const dtoDesc = new CreateSurveyDTO({ title: 'Titre', description: longDesc, questions: ['Q1'] });
  assert.throws(() => dtoDesc.validate(), ValidationError);

  const longQText = 'q'.repeat(501);
  const dtoQText = new CreateSurveyDTO({ title: 'Titre', questions: [{ text: longQText }] });
  assert.throws(() => dtoQText.validate(), ValidationError);
});

test('CreateSurveyDTO validate rejects dangerous image URL protocols', () => {
  const xssJsUrl = new CreateSurveyDTO({
    title: 'Titre',
    questions: [{ text: 'Q1', imageUrl: 'javascript:alert(1)' }],
  });
  assert.throws(() => xssJsUrl.validate(), ValidationError);

  const xssDataUrl = new CreateSurveyDTO({
    title: 'Titre',
    questions: [
      { text: 'Q1', imageUrl: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==' },
    ],
  });
  assert.throws(() => xssDataUrl.validate(), ValidationError);

  const fileUrl = new CreateSurveyDTO({
    title: 'Titre',
    questions: [{ text: 'Q1', imageUrl: 'file:///etc/passwd' }],
  });
  assert.throws(() => fileUrl.validate(), ValidationError);

  const validHttp = new CreateSurveyDTO({
    title: 'Titre',
    questions: [{ text: 'Q1', imageUrl: 'http://cdn.test/img.png' }],
  });
  assert.doesNotThrow(() => validHttp.validate());

  const validHttps = new CreateSurveyDTO({
    title: 'Titre',
    questions: [{ text: 'Q1', imageUrl: 'https://cdn.test/img.png' }],
  });
  assert.doesNotThrow(() => validHttps.validate());
});

test('CreateSurveyDTO validate limits total questions and options count', () => {
  const tooManyQuestions = Array.from({ length: 51 }, (_, i) => ({ text: `Q${i}` }));
  const dtoQuestions = new CreateSurveyDTO({ title: 'Titre', questions: tooManyQuestions });
  assert.throws(() => dtoQuestions.validate(), ValidationError);

  const tooManyOptions = Array.from({ length: 21 }, (_, i) => ({ text: `Opt${i}` }));
  const dtoOptions = new CreateSurveyDTO({
    title: 'Titre',
    questions: [{ text: 'Q1', options: tooManyOptions }],
  });
  assert.throws(() => dtoOptions.validate(), ValidationError);

  const longOptionText = 'o'.repeat(201);
  const dtoOptionText = new CreateSurveyDTO({
    title: 'Titre',
    questions: [{ text: 'Q1', options: [{ text: longOptionText }] }],
  });
  assert.throws(() => dtoOptionText.validate(), ValidationError);
});

test('SubmitResponseDTO validate enforces security length limits', () => {
  const longName = 'p'.repeat(101);
  const dtoName = new SubmitResponseDTO({
    participantName: longName,
    answers: [{ questionId: 'q-1', selectedOptionIds: ['opt-1'] }],
  });
  assert.throws(() => dtoName.validate(), ValidationError);

  const tooManyAnswers = Array.from({ length: 51 }, (_, i) => ({
    questionId: `q-${i}`,
    selectedOptionIds: ['opt-1'],
  }));
  const dtoAnswers = new SubmitResponseDTO({ answers: tooManyAnswers });
  assert.throws(() => dtoAnswers.validate(), ValidationError);

  const tooManySelected = Array.from({ length: 21 }, (_, i) => `opt-${i}`);
  const dtoSelected = new SubmitResponseDTO({
    answers: [{ questionId: 'q-1', selectedOptionIds: tooManySelected }],
  });
  assert.throws(() => dtoSelected.validate(), ValidationError);
});
