# Roadmap & TODO - allToqcm

Architecture : Clean Architecture / DDD Léger
Paradigme : POO (SOLID, Encapsulation avec champs privés `#`, pas de commentaires dans le code)
Technologies : Node.js (ESM), PostgreSQL (`pg`), Express

---

## 1. Infrastructure & Base de Données
- [ ] **DatabaseConnection** (`src/infrastructure/database/DatabaseConnection.js`)
  - Initialiser le pool PostgreSQL `pg.Pool` avec les variables d'environnement
  - Implémenter `query(sql, params)`
  - Implémenter `getClient()` pour les transactions
  - Implémenter `close()` pour l'arrêt gracieux
- [ ] **Migration Runner** (`src/infrastructure/database/migrate.js`)
  - Lire et exécuter `src/infrastructure/database/schema.sql`
  - Gérer les erreurs de migration et fermer la connexion proprement

---

## 2. Couche Domaine (Domain Layer)
- [ ] **Value Object Score** (`src/domain/value-objects/Score.js`)
  - Encapsuler `#pointsEarned` et `#totalPoints`
  - Calculer `percentage`
  - Méthode `isPassing(minimumPassingPercentage)`
  - Immutabilité et méthode `equals(otherScore)`
- [ ] **Entity Option** (`src/domain/entities/Option.js`)
  - Encapsuler `#id`, `#text`, `#isCorrect`
  - Validation (texte non vide)
  - Méthode de sérialisation `toJSON()`
- [ ] **Entity Question** (`src/domain/entities/Question.js`)
  - Encapsuler `#id`, `#quizId`, `#text`, `#points`, `#options`
  - Méthodes `addOption(option)` et `removeOption(optionId)`
  - Vérification `hasCorrectOption()`
  - Méthode d'évaluation `evaluateAnswers(selectedOptionIds)` calculant les points obtenus
- [ ] **Entity Quiz** (`src/domain/entities/Quiz.js`)
  - Encapsuler `#id`, `#title`, `#description`, `#questions`, `#createdAt`, `#updatedAt`
  - Méthodes `addQuestion(question)` et `removeQuestion(questionId)`
  - Calcul dynamique de `totalPoints`
  - Méthode de validation métier `validateCompleteness()` (doit avoir au moins une question valide avec des options)
- [ ] **Entity AttemptAnswer** (`src/domain/entities/AttemptAnswer.js`)
  - Encapsuler `#questionId`, `#selectedOptionIds`
- [ ] **Entity QuizAttempt** (`src/domain/entities/QuizAttempt.js`)
  - Encapsuler `#id`, `#quizId`, `#participantName`, `#answers`, `#score`, `#startedAt`, `#completedAt`
  - Méthode `recordAnswer(attemptAnswer)`
  - Méthode `complete(score)` fixant la date de fin et le score final

---

## 3. Couche Application (Use Cases & DTOs)
- [ ] **DTOs**
  - `CreateQuizDTO` : validation du format de payload pour la création de QCM
  - `SubmitAttemptDTO` : validation du format de réponses soumises
- [ ] **Créateur de QCM (Quiz Creator Use Cases)**
  - `CreateQuizUseCase` : valider et persister un nouveau QCM
  - `GetQuizByIdUseCase` : récupérer un QCM par son identifiant
  - `ListQuizzesUseCase` : lister tous les QCMs disponibles
  - `UpdateQuizUseCase` : modifier le titre/description d'un QCM existant
  - `DeleteQuizUseCase` : supprimer un QCM
  - `AddQuestionUseCase` : rattacher une nouvelle question à un QCM existant
  - `RemoveQuestionUseCase` : détacher une question d'un QCM
- [ ] **Moteur de Passage (Quiz Runner Use Cases)**
  - `StartQuizAttemptUseCase` : démarrer une tentative de QCM pour un candidat
  - `SubmitQuizAttemptUseCase` : évaluer les réponses par rapport aux bonnes réponses et enregistrer le score
  - `GetAttemptResultUseCase` : récupérer le résultat et le détail d'une tentative

---

## 4. Couche Infrastructure (Repositories & Web Server)
- [ ] **PostgresQuizRepository** (`src/infrastructure/repositories/PostgresQuizRepository.js`)
  - Implémenter `save(quiz)` avec transaction SQL (quiz + questions + options)
  - Implémenter `findById(id)` avec jointures ou requêtes groupées
  - Implémenter `findAll()`
  - Implémenter `update(quiz)`
  - Implémenter `delete(id)`
- [ ] **PostgresQuizAttemptRepository** (`src/infrastructure/repositories/PostgresQuizAttemptRepository.js`)
  - Implémenter `save(quizAttempt)` avec insertion de la tentative et des réponses
  - Implémenter `findById(id)`
  - Implémenter `findByQuizId(quizId)`
  - Implémenter `update(quizAttempt)`
- [ ] **Server HTTP** (`src/infrastructure/http/Server.js`)
  - Initialiser l'application Express
  - Configurer les middlewares standard (express.json, cors)
  - Enregistrer les routes et le gestionnaire d'erreur
  - Gérer l'écoute sur le port configuré

---

## 5. Couche Présentation (Controllers & Routes)
- [ ] **QuizCreatorController** (`src/presentation/controllers/QuizCreatorController.js`)
  - Handlers REST pour POST /quizzes, GET /quizzes, GET /quizzes/:id, PUT /quizzes/:id, DELETE /quizzes/:id
  - Handlers pour POST /quizzes/:id/questions, DELETE /quizzes/:id/questions/:questionId
- [ ] **QuizRunnerController** (`src/presentation/controllers/QuizRunnerController.js`)
  - Handlers REST pour POST /quizzes/:id/attempts, POST /attempts/:id/submit, GET /attempts/:id
- [ ] **Routes Express**
  - `createQuizRouter` dans `src/presentation/routes/quizRoutes.js`
  - `createAttemptRouter` dans `src/presentation/routes/attemptRoutes.js`
- [ ] **Error Handler** (`src/presentation/middlewares/errorHandler.js`)
  - Mapper `EntityNotFoundError` vers HTTP 404
  - Mapper `ValidationError` vers HTTP 400
  - Mapper `DomainError` vers HTTP 422
  - Mapper les erreurs inconnues vers HTTP 500

---

## 6. Composition Root & Démarrage
- [ ] **Container DI** (`src/container/Container.js`)
  - Instancier `DatabaseConnection`
  - Instancier les repositories en leur injectant la connexion
  - Instancier les cas d'utilisation en leur injectant les repositories
  - Instancier les contrôleurs en leur injectant les cas d'utilisation
  - Instancier le serveur HTTP
- [ ] **Bootstrap** (`src/index.js`)
  - Charger les variables d'environnement
  - Initialiser le container et démarrer le serveur
  - Écouter `SIGINT` et `SIGTERM` pour libérer le pool de connexions

---

## 7. Tests & Validation
- [ ] Tests unitaires sur les entités de domaine (`Quiz`, `Question`, `Score`, `QuizAttempt`)
- [ ] Tests unitaires sur les cas d'utilisation avec repositories mockés
- [ ] Tests d'intégration sur les repositories PostgreSQL
- [ ] Tests E2E des endpoints API

