import test from 'node:test';
import assert from 'node:assert/strict';
import { Score } from '../src/domain/value-objects/Score.js';
import { Option } from '../src/domain/entities/Option.js';
import { Question } from '../src/domain/entities/Question.js';
import { Quiz } from '../src/domain/entities/Quiz.js';
import { AttemptAnswer } from '../src/domain/entities/AttemptAnswer.js';
import { QuizAttempt } from '../src/domain/entities/QuizAttempt.js';
import { ValidationError } from '../src/domain/errors/ValidationError.js';

test('Score value object calculates percentage and validates constraints', () => {
  const score = new Score(15, 20);
  assert.equal(score.pointsEarned, 15);
  assert.equal(score.totalPoints, 20);
  assert.equal(score.percentage, 75);
  assert.equal(score.isPassing(70), true);
  assert.equal(score.isPassing(80), false);

  const sameScore = new Score(15, 20);
  assert.equal(score.equals(sameScore), true);

  assert.throws(() => new Score(-1, 10), ValidationError);
  assert.throws(() => new Score(5, 0), ValidationError);
  assert.throws(() => new Score(15, 10), ValidationError);
});

test('Option entity validates text and encapsulates state', () => {
  const option = new Option('opt-1', 'JavaScript', true);
  assert.equal(option.id, 'opt-1');
  assert.equal(option.text, 'JavaScript');
  assert.equal(option.isCorrect, true);

  option.updateText('TypeScript');
  assert.equal(option.text, 'TypeScript');

  option.setIsCorrect(false);
  assert.equal(option.isCorrect, false);

  assert.throws(() => new Option('opt-2', ''), ValidationError);
  assert.throws(() => option.updateText('   '), ValidationError);
});

test('Question entity evaluates answers accurately', () => {
  const optionA = new Option('opt-a', 'Option A', true);
  const optionB = new Option('opt-b', 'Option B', false);
  const question = new Question('q-1', 'quiz-1', 'What is Node?', 2, [optionA, optionB]);

  assert.equal(question.points, 2);
  assert.equal(question.hasCorrectOption(), true);
  assert.deepEqual(question.getCorrectOptionIds(), ['opt-a']);

  assert.equal(question.evaluateAnswers(['opt-a']), 2);
  assert.equal(question.evaluateAnswers(['opt-b']), 0);
  assert.equal(question.evaluateAnswers([]), 0);
  assert.equal(question.evaluateAnswers(['opt-a', 'opt-b']), 0);

  question.removeOption('opt-b');
  assert.equal(question.options.length, 1);
});

test('Quiz entity computes points and validates completeness', () => {
  const quiz = new Quiz('quiz-1', 'Tech Quiz', 'General tech');
  assert.equal(quiz.title, 'Tech Quiz');
  assert.equal(quiz.totalPoints, 0);

  assert.throws(() => quiz.validateCompleteness(), ValidationError);

  const question = new Question('q-1', quiz.id, 'Sample question', 5, [
    new Option('opt-1', 'Choice 1', true),
    new Option('opt-2', 'Choice 2', false),
  ]);

  quiz.addQuestion(question);
  assert.equal(quiz.totalPoints, 5);
  assert.doesNotThrow(() => quiz.validateCompleteness());

  quiz.updateDetails('Updated Tech Quiz', 'Updated description');
  assert.equal(quiz.title, 'Updated Tech Quiz');
});

test('QuizAttempt tracks answers and finishes with score', () => {
  const attempt = new QuizAttempt('att-1', 'quiz-1', 'Alice');
  assert.equal(attempt.participantName, 'Alice');
  assert.equal(attempt.isCompleted, false);

  const answer = new AttemptAnswer('q-1', ['opt-1']);
  attempt.recordAnswer(answer);
  assert.equal(attempt.answers.length, 1);

  const score = new Score(5, 5);
  attempt.complete(score);

  assert.equal(attempt.isCompleted, true);
  assert.equal(attempt.score.percentage, 100);

  assert.throws(() => attempt.recordAnswer(answer), ValidationError);
  assert.throws(() => attempt.complete(score), ValidationError);
});

