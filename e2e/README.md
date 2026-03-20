# QA E2E — auto.canadaquebec.ca

Suite de tests automatisés avec **Playwright + Cucumber (Gherkin) + Allure**.

## Stack

| Outil | Rôle |
|---|---|
| [Playwright](https://playwright.dev) | Pilote le navigateur (Chromium) |
| [Cucumber](https://cucumber.io) | Lie les scénarios Gherkin au code |
| [Gherkin](https://cucumber.io/docs/gherkin/) | Scénarios lisibles en français |
| [Allure](https://allurereport.org) | Rapport HTML visuel |

## Structure

```
e2e/
├── features/           # Scénarios Gherkin (.feature)
│   ├── filtres.feature
│   ├── vehicule.feature
│   └── concessionnaires.feature
├── steps/              # Step definitions TypeScript
│   └── filtres.steps.ts
├── pages/              # Page Object Model
│   ├── BasePage.ts     # Utilitaires simulation humaine
│   ├── ListingPage.ts  # Page principale (/)
│   ├── DealersPage.ts  # Page concessionnaires (/dealers)
│   └── VehiclePage.ts  # Fiche véhicule
├── support/
│   ├── world.ts        # Contexte partagé Cucumber
│   └── hooks.ts        # Before/After (browser lifecycle, screenshots)
├── reports/            # Rapports générés (gitignore)
└── allure-results/     # Données Allure (gitignore)
```

## Lancer les tests

```bash
cd e2e
npm install
npx playwright install chromium --with-deps

# Tous les tests (headless)
npm test

# Mode headed (voir le navigateur)
npm run test:headed

# Seulement les tests smoke
npx cucumber-js --tags @smoke

# Seulement les tests slider
npx cucumber-js --tags @slider
```

## Générer le rapport Allure

```bash
npm run allure:generate
npm run allure:open
```

## Variables d'environnement

| Variable | Défaut | Description |
|---|---|---|
| `QA_BASE_URL` | `https://auto.canadaquebec.ca` | URL du site à tester |
| `HEADLESS` | `true` | `false` pour voir le navigateur |

## CI/CD

Le workflow `.github/workflows/qa.yml` :
- Se déclenche à chaque push sur `main`
- S'exécute automatiquement toutes les 6h
- Publie le rapport Allure sur GitHub Pages
- Envoie une alerte Slack en cas d'échec (configurer `SLACK_WEBHOOK_URL` dans les secrets)

## Ajouter un scénario

1. Écrire le scénario en français dans `features/xxx.feature`
2. Lancer `npm test` — Cucumber affiche les steps manquants
3. Implémenter les steps dans `steps/xxx.steps.ts`
4. Si besoin, ajouter des méthodes dans le Page Object correspondant
