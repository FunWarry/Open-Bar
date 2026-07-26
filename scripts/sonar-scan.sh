#!/usr/bin/env bash
# OpenBar — Script d'exécution et de validation SonarCloud en local (Bash)
set -e

echo "=========================================="
echo "   OpenBar — Sonar Scan Local Validation  "
echo "=========================================="

echo -e "\n[1/3] Backend — Préparation des binaries et dépendances..."
(cd backend && mvn test-compile dependency:copy-dependencies -DincludeScope=test -DoutputDirectory=target/dependency -q)

echo -e "\n[2/3] Frontend — Génération du rapport LCOV (Karma)..."
(cd frontend && npx ng test --watch=false --browsers=ChromeHeadless --code-coverage)

echo -e "\n[3/3] Exécution de SonarScanner Local..."
npx -y sonar-scanner "-Dsonar.qualitygate.wait=true"

echo -e "\n✅ Sonar Scan Local PASSED !"
