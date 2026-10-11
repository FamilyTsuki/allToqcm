import os from 'node:os';
import { CreateSurveyDTO } from '../../application/dtos/CreateSurveyDTO.js';
import { SurveyCsvPresenter } from '../presenters/SurveyCsvPresenter.js';

export class SurveyCreatorController {
  #createSurveyUseCase;
  #listSurveysUseCase;
  #getSurveyByIdUseCase;
  #deleteSurveyUseCase;
  #getSurveyStatsUseCase;
  #toggleSurveyStatusUseCase;
  #duplicateSurveyUseCase;
  #compareSurveysUseCase;
  #qrCodeService;
  #runnerPort;

  constructor({
    createSurveyUseCase,
    listSurveysUseCase,
    getSurveyByIdUseCase,
    deleteSurveyUseCase,
    getSurveyStatsUseCase,
    toggleSurveyStatusUseCase,
    duplicateSurveyUseCase,
    compareSurveysUseCase,
    qrCodeService = null,
    runnerPort = 3002,
  }) {
    this.#createSurveyUseCase = createSurveyUseCase;
    this.#listSurveysUseCase = listSurveysUseCase;
    this.#getSurveyByIdUseCase = getSurveyByIdUseCase;
    this.#deleteSurveyUseCase = deleteSurveyUseCase;
    this.#getSurveyStatsUseCase = getSurveyStatsUseCase;
    this.#toggleSurveyStatusUseCase = toggleSurveyStatusUseCase;
    this.#duplicateSurveyUseCase = duplicateSurveyUseCase;
    this.#compareSurveysUseCase = compareSurveysUseCase;
    this.#qrCodeService = qrCodeService;
    this.#runnerPort = runnerPort;

    this.createSurvey = this.createSurvey.bind(this);
    this.listSurveys = this.listSurveys.bind(this);
    this.getSurveyById = this.getSurveyById.bind(this);
    this.deleteSurvey = this.deleteSurvey.bind(this);
    this.getSurveyStats = this.getSurveyStats.bind(this);
    this.getSurveyShare = this.getSurveyShare.bind(this);
    this.toggleStatus = this.toggleStatus.bind(this);
    this.duplicateSurvey = this.duplicateSurvey.bind(this);
    this.exportCsv = this.exportCsv.bind(this);
    this.compareSurveys = this.compareSurveys.bind(this);
  }

  getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
    return null;
  }

  buildShareUrl(req, surveyId) {
    if (process.env.PUBLIC_RUNNER_URL) {
      const base = process.env.PUBLIC_RUNNER_URL.replace(/\/+$/, '');
      return `${base}/?survey=${surveyId}`;
    }
    const hostFromEnv = process.env.PUBLIC_HOST;
    const protocol = req.headers?.['x-forwarded-proto'] || req.protocol;
    const isLocal = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
    const lanIp = isLocal ? this.getLocalIp() : null;
    const hostname = hostFromEnv || lanIp || req.hostname;
    return `${protocol}://${hostname}:${this.#runnerPort}/?survey=${surveyId}`;
  }

  async createSurvey(req, res, next) {
    try {
      const dto = CreateSurveyDTO.fromJSON(req.body);
      const survey = await this.#createSurveyUseCase.execute(dto);
      const shareUrl = this.buildShareUrl(req, survey.id);
      const qrCode = this.#qrCodeService
        ? await this.#qrCodeService.generateDataUrl(shareUrl)
        : null;

      res.status(201).json({
        ...survey.toJSON(),
        shareUrl,
        qrCode,
      });
    } catch (error) {
      next(error);
    }
  }

  async listSurveys(_req, res, next) {
    try {
      const surveys = await this.#listSurveysUseCase.execute();
      res.status(200).json(surveys.map((s) => s.toJSON()));
    } catch (error) {
      next(error);
    }
  }

  async getSurveyById(req, res, next) {
    try {
      const survey = await this.#getSurveyByIdUseCase.execute(req.params.id);
      res.status(200).json(survey.toJSON());
    } catch (error) {
      next(error);
    }
  }

  async deleteSurvey(req, res, next) {
    try {
      await this.#deleteSurveyUseCase.execute(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async getSurveyStats(req, res, next) {
    try {
      const stats = await this.#getSurveyStatsUseCase.execute(req.params.id);
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  }

  async getSurveyShare(req, res, next) {
    try {
      const survey = await this.#getSurveyByIdUseCase.execute(req.params.id);
      const shareUrl = this.buildShareUrl(req, survey.id);
      const rawColor = typeof req.query.color === 'string' ? req.query.color.trim() : '';
      const color = /^#[0-9a-fA-F]{6}$/.test(rawColor) ? rawColor : '#000000';
      const qrCode = this.#qrCodeService
        ? await this.#qrCodeService.generateDataUrl(shareUrl, {
            color: { dark: color, light: '#ffffff' },
          })
        : null;

      res.status(200).json({
        surveyId: survey.id,
        surveyTitle: survey.title,
        shareUrl,
        qrCode,
        color,
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleStatus(req, res, next) {
    try {
      const survey = await this.#toggleSurveyStatusUseCase.execute(req.params.id);
      res.status(200).json(survey.toJSON());
    } catch (error) {
      next(error);
    }
  }

  async duplicateSurvey(req, res, next) {
    try {
      const survey = await this.#duplicateSurveyUseCase.execute(req.params.id);
      res.status(201).json(survey.toJSON());
    } catch (error) {
      next(error);
    }
  }

  async exportCsv(req, res, next) {
    try {
      const stats = await this.#getSurveyStatsUseCase.execute(req.params.id);
      const csvContent = SurveyCsvPresenter.toCsv(stats);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="resultats-${stats.survey.id}.csv"`,
      );
      res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  }

  async compareSurveys(req, res, next) {
    try {
      const { a, b } = req.query;
      const comparison = await this.#compareSurveysUseCase.execute(a, b);
      res.status(200).json(comparison);
    } catch (error) {
      next(error);
    }
  }
}
