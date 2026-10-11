# Roadmap & Documentation - allToAsk (Questionnaire d'Opinion)

Architecture : Clean Architecture / DDD Léger (Simplifié sans superflu)
Paradigme : POO (SOLID, Encapsulation avec champs privés `#`, aucun commentaire dans le code)
Technologies : Node.js (ESM), PostgreSQL (`pg`), Express

---

## 1. Modèle Métier Épuré (Opinion Survey)
- [x] **Option** (`src/domain/entities/Option.js`)
  - Texte de l'option (sans notion de bonne/mauvaise réponse)
- [x] **Question** (`src/domain/entities/Question.js`)
  - Intitulé et liste des choix d'opinion (sans notion de points)
- [x] **Survey** (`src/domain/entities/Survey.js`)
  - Titre, description, liste des questions, statut de clôture `isClosed`
- [x] **SurveyAnswer & SurveyResponse** (`src/domain/entities/SurveyResponse.js`)
  - Nom du répondant (ou anonyme), réponses sélectionnées, date de soumission

---

## 2. Cas d'Utilisation
- [x] **Espace Créateur (Port 3001)**
  - `CreateSurveyUseCase` : créer un questionnaire d'opinion
  - `ListSurveysUseCase` : lister les questionnaires
  - `GetSurveyByIdUseCase` : consulter un questionnaire
  - `DeleteSurveyUseCase` : supprimer un questionnaire
  - `GetSurveyStatsUseCase` : agréger les votes et pourcentages d'opinions
  - `ToggleSurveyStatusUseCase` : basculer l'état ouvert/fermé du questionnaire
  - `DuplicateSurveyUseCase` : cloner un questionnaire avec questions indépendantes
- [x] **Espace Répondant (Port 3002)**
  - `SubmitSurveyResponseUseCase` : enregistrer un avis / vote (bloqué si fermé)

---

## 3. Base de Données & Repositories
- [x] **Schéma PostgreSQL** (`src/infrastructure/database/schema.sql`)
  - Tables : `surveys` (avec `is_closed`), `questions`, `options`, `responses`, `response_answers`
- [x] **Repositories**
  - `PostgresSurveyRepository`
  - `PostgresSurveyResponseRepository`

---

## 4. Présentation, Ergonomie & Nouveaux Modules

### Module 2 : Export & Partage physique
- [x] **Téléchargement QR Code PNG** : Téléchargement instantané de l'image QR Code haute résolution depuis la modale de partage (`qrcode-{id}.png`).
- [x] **Export CSV des résultats** : Export `.csv` encodé en UTF-8 BOM avec répartition des votes et pourcentages (compatible tableurs Excel et LibreOffice).

### Module 3 : Contrôle & Intégrité des votes
- [x] **Clôture / Réouverture en 1 clic** : Bascule du statut depuis l'espace créateur avec badge visuel (`Actif` / `Clôturé`).
- [x] **Protection questionnaire fermé** : Écran dédié pour le répondant, blocage de l'API côté serveur.
- [x] **Protection anti-double vote** : Détection locale via `localStorage`, écran "Avis déjà enregistré" avec possibilité de modifier son vote si nécessaire.

### Module 5 : Gestion & Édition pour le créateur
- [x] **Duplication en 1 clic** : Bouton `Dupliquer` créant instantanément une copie (`[Copie] ...`) avec nouveaux identifiants.
- [x] **Réorganisation des questions** : Boutons de réordonnancement `↑` et `↓` par question, avec renumérotation automatique.
- [x] **Raccourcis clavier** :
  - `Alt+N` : Ajouter une question
  - `Entrée` : Passer à la question suivante
  - `Ctrl+Enter` / `Cmd+Enter` : Publier le questionnaire
  - `Échap` : Fermer les modales

---

## 5. Qualité & Tests
- [x] Tests unitaires domaine et cas d'utilisation (`npm test`) : 8/8 tests réussis
- [x] ESLint & Prettier sans avertissement
- [x] Zéro commentaire dans l'intégralité du code source
