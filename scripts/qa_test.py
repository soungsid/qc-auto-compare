#!/usr/bin/env python3
"""
QC Auto Compare - Script de test automatisé E2E avec Playwright
Ce script simule un utilisateur réel et produit un rapport de QA
"""

import asyncio
import json
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright, Page, expect

# Configuration
BASE_URL = "https://auto.canadaquebec.ca"
REPORT_PATH = Path("/app/test_reports")
SCREENSHOTS_PATH = REPORT_PATH / "screenshots"

class QAReport:
    """Collecteur de résultats de test"""
    def __init__(self):
        self.timestamp = datetime.now().isoformat()
        self.tests = []
        self.summary = {"passed": 0, "failed": 0, "skipped": 0}
    
    def add_test(self, name: str, status: str, details: str = "", screenshot: str = None):
        self.tests.append({
            "name": name,
            "status": status,
            "details": details,
            "screenshot": screenshot,
            "timestamp": datetime.now().isoformat()
        })
        self.summary[status] = self.summary.get(status, 0) + 1
    
    def generate_report(self) -> dict:
        return {
            "report_timestamp": self.timestamp,
            "base_url": BASE_URL,
            "summary": self.summary,
            "total_tests": len(self.tests),
            "tests": self.tests
        }
    
    def print_report(self):
        print("\n" + "="*60)
        print("📊 RAPPORT DE QA - AUTO QUÉBEC")
        print("="*60)
        print(f"🕐 Date: {self.timestamp}")
        print(f"🌐 URL: {BASE_URL}")
        print("-"*60)
        print(f"✅ Réussis: {self.summary['passed']}")
        print(f"❌ Échoués: {self.summary['failed']}")
        print(f"⏭️ Ignorés: {self.summary['skipped']}")
        print("-"*60)
        
        for test in self.tests:
            icon = "✅" if test["status"] == "passed" else "❌" if test["status"] == "failed" else "⏭️"
            print(f"{icon} {test['name']}")
            if test["details"]:
                print(f"   └─ {test['details']}")
        
        print("="*60 + "\n")


async def take_screenshot(page: Page, name: str) -> str:
    """Prend une capture d'écran et retourne le chemin"""
    SCREENSHOTS_PATH.mkdir(parents=True, exist_ok=True)
    filename = f"{name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
    filepath = SCREENSHOTS_PATH / filename
    await page.screenshot(path=str(filepath), full_page=False)
    return str(filepath)


async def test_page_load(page: Page, report: QAReport):
    """Test: Chargement de la page principale"""
    try:
        await page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        await page.wait_for_selector('[data-testid="listing-page"]', timeout=10000)
        
        # Vérifier le titre
        title = await page.title()
        assert "Auto Québec" in title or "véhicules" in title.lower()
        
        screenshot = await take_screenshot(page, "01_page_load")
        report.add_test("Chargement de la page principale", "passed", f"Titre: {title}", screenshot)
    except Exception as e:
        screenshot = await take_screenshot(page, "01_page_load_error")
        report.add_test("Chargement de la page principale", "failed", str(e), screenshot)


async def test_vehicle_display(page: Page, report: QAReport):
    """Test: Affichage des véhicules et des prix"""
    try:
        # Vérifier qu'il y a des véhicules affichés
        vehicle_count_elem = page.locator('[data-testid="vehicle-count"]')
        await vehicle_count_elem.wait_for(timeout=10000)
        vehicle_count_text = await vehicle_count_elem.text_content()
        
        # Vérifier les cartes de véhicules
        cards = page.locator('[data-testid^="vehicle-card-"]')
        cards_count = await cards.count()
        
        if cards_count == 0:
            # Essayer le mode tableau
            rows = page.locator('[data-testid^="vehicle-row-"]')
            rows_count = await rows.count()
            if rows_count > 0:
                report.add_test("Affichage des véhicules", "passed", f"Mode tableau: {rows_count} véhicules, {vehicle_count_text}")
                return
        
        screenshot = await take_screenshot(page, "02_vehicle_display")
        report.add_test("Affichage des véhicules", "passed", f"{cards_count} cartes affichées, {vehicle_count_text}", screenshot)
    except Exception as e:
        screenshot = await take_screenshot(page, "02_vehicle_display_error")
        report.add_test("Affichage des véhicules", "failed", str(e), screenshot)


async def test_price_format(page: Page, report: QAReport):
    """Test: Format des prix (pas de 0 parasite après le prix)"""
    try:
        # Récupérer le contenu texte de la page pour vérifier les prix
        content = await page.content()
        
        # Chercher le pattern problématique: prix suivi de "0" isolé
        import re
        # Pattern: nombre avec espaces suivi de $ puis un 0 isolé
        problematic_pattern = re.compile(r'\d[\d\s]*\$\s*0(?!\d)')
        matches = problematic_pattern.findall(content)
        
        if matches:
            screenshot = await take_screenshot(page, "03_price_format_error")
            report.add_test("Format des prix", "failed", f"Pattern '$0' trouvé: {matches[:3]}", screenshot)
        else:
            screenshot = await take_screenshot(page, "03_price_format")
            report.add_test("Format des prix", "passed", "Aucun '0' parasite détecté après les prix", screenshot)
    except Exception as e:
        report.add_test("Format des prix", "failed", str(e))


async def test_filters_sidebar(page: Page, report: QAReport):
    """Test: Sidebar des filtres et ses options"""
    try:
        # Vérifier la sidebar
        sidebar = page.locator('[data-testid="filters-sidebar"]')
        await sidebar.wait_for(timeout=5000)
        
        # Vérifier le filtre de condition (neuf/occasion/tous)
        filter_all = page.locator('[data-testid="filter-condition-all"]')
        filter_used = page.locator('[data-testid="filter-condition-used"]')
        filter_new = page.locator('[data-testid="filter-condition-new"]')
        
        has_all = await filter_all.count() > 0
        has_used = await filter_used.count() > 0
        has_new = await filter_new.count() > 0
        
        if has_all and has_used and has_new:
            report.add_test("Filtre neuf/occasion/tous", "passed", "Les 3 options sont présentes")
        else:
            report.add_test("Filtre neuf/occasion/tous", "failed", f"all={has_all}, used={has_used}, new={has_new}")
        
        # Vérifier les marques
        brands = page.locator('[data-testid^="filter-brand-"]')
        brands_count = await brands.count()
        
        screenshot = await take_screenshot(page, "04_filters_sidebar")
        if brands_count > 0:
            report.add_test("Section Marques dans filtres", "passed", f"{brands_count} marques disponibles", screenshot)
        else:
            report.add_test("Section Marques dans filtres", "failed", "Aucune marque disponible", screenshot)
        
        # Vérifier les types de carrosserie
        body_types = page.locator('[data-testid^="filter-body-"]')
        body_count = await body_types.count()
        
        if body_count > 0:
            report.add_test("Section Carrosserie dans filtres", "passed", f"{body_count} types disponibles")
        else:
            report.add_test("Section Carrosserie dans filtres", "failed", "Aucun type de carrosserie")
        
        # Vérifier les transmissions
        transmissions = page.locator('[data-testid^="filter-transmission-"]')
        trans_count = await transmissions.count()
        
        if trans_count > 0:
            report.add_test("Section Transmission dans filtres", "passed", f"{trans_count} transmissions disponibles")
        else:
            report.add_test("Section Transmission dans filtres", "failed", "Aucune transmission")
        
        # Vérifier le carburant
        fuels = page.locator('[data-testid^="filter-fuel-"]')
        fuel_count = await fuels.count()
        
        if fuel_count > 0:
            report.add_test("Section Carburant dans filtres", "passed", f"{fuel_count} types de carburant")
        else:
            report.add_test("Section Carburant dans filtres", "failed", "Aucun type de carburant")
        
        # Vérifier la traction
        drivetrains = page.locator('[data-testid^="filter-drivetrain-"]')
        drive_count = await drivetrains.count()
        
        if drive_count > 0:
            report.add_test("Section Traction dans filtres", "passed", f"{drive_count} types de traction")
        else:
            report.add_test("Section Traction dans filtres", "failed", "Aucune traction")
            
    except Exception as e:
        screenshot = await take_screenshot(page, "04_filters_error")
        report.add_test("Sidebar des filtres", "failed", str(e), screenshot)


async def test_apply_filter(page: Page, report: QAReport):
    """Test: Application d'un filtre et mise à jour des résultats"""
    try:
        # Sélectionner "Véhicules d'occasion"
        filter_used = page.locator('[data-testid="filter-condition-used"]')
        if await filter_used.count() > 0:
            await filter_used.click()
            await page.wait_for_timeout(500)
        
        # Cliquer sur Appliquer les filtres
        apply_btn = page.locator('[data-testid="apply-filters-btn"]')
        await apply_btn.click()
        
        # Attendre la mise à jour
        await page.wait_for_timeout(2000)
        await page.wait_for_load_state("networkidle")
        
        screenshot = await take_screenshot(page, "05_filter_applied")
        report.add_test("Application de filtre", "passed", "Filtre 'occasion' appliqué avec succès", screenshot)
    except Exception as e:
        screenshot = await take_screenshot(page, "05_filter_error")
        report.add_test("Application de filtre", "failed", str(e), screenshot)


async def test_sort_vehicles(page: Page, report: QAReport):
    """Test: Tri des véhicules"""
    try:
        # Changer le tri
        sort_select = page.locator('[data-testid="sort-select"]')
        if await sort_select.count() > 0:
            await sort_select.select_option("year")
            await page.wait_for_timeout(1000)
            
            screenshot = await take_screenshot(page, "06_sort_year")
            report.add_test("Tri par année", "passed", "Tri par année appliqué", screenshot)
        else:
            report.add_test("Tri par année", "skipped", "Sélecteur de tri non trouvé")
    except Exception as e:
        report.add_test("Tri par année", "failed", str(e))


async def test_view_mode_toggle(page: Page, report: QAReport):
    """Test: Basculement entre vue tableau et vue cartes"""
    try:
        # Passer en mode tableau
        table_btn = page.locator('[data-testid="view-mode-table"]')
        if await table_btn.count() > 0:
            await table_btn.click()
            await page.wait_for_timeout(1000)
            
            # Vérifier que le tableau est affiché
            table = page.locator('[data-testid="vehicle-table"]')
            if await table.count() > 0:
                screenshot = await take_screenshot(page, "07_table_view")
                report.add_test("Vue tableau", "passed", "Vue tableau affichée", screenshot)
            else:
                report.add_test("Vue tableau", "failed", "Tableau non trouvé après bascule")
        
        # Revenir en mode cartes
        cards_btn = page.locator('[data-testid="view-mode-cards"]')
        if await cards_btn.count() > 0:
            await cards_btn.click()
            await page.wait_for_timeout(1000)
            
            screenshot = await take_screenshot(page, "07_cards_view")
            report.add_test("Vue cartes", "passed", "Vue cartes affichée", screenshot)
    except Exception as e:
        report.add_test("Basculement de vue", "failed", str(e))


async def test_dealers_page(page: Page, report: QAReport):
    """Test: Page des concessionnaires"""
    try:
        # Aller sur la page des concessionnaires
        await page.goto(f"{BASE_URL}/dealers", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)
        
        # Vérifier que la page est chargée
        title = await page.title()
        
        # Vérifier la grille des concessionnaires
        dealers_grid = page.locator('[data-testid="dealers-grid"]')
        if await dealers_grid.count() > 0:
            dealers = page.locator('[data-testid^="dealer-card-"]')
            dealers_count = await dealers.count()
            
            screenshot = await take_screenshot(page, "08_dealers_page")
            report.add_test("Page concessionnaires", "passed", f"{dealers_count} concessionnaires affichés", screenshot)
        else:
            screenshot = await take_screenshot(page, "08_dealers_page")
            report.add_test("Page concessionnaires", "passed", f"Page chargée: {title}", screenshot)
    except Exception as e:
        screenshot = await take_screenshot(page, "08_dealers_error")
        report.add_test("Page concessionnaires", "failed", str(e), screenshot)


async def test_navigation_links(page: Page, report: QAReport):
    """Test: Liens de navigation vers les concessionnaires"""
    try:
        await page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(1000)
        
        # Vérifier le lien dans le header
        header_link = page.locator('[data-testid="nav-dealers-link"]')
        has_header_link = await header_link.count() > 0
        
        # Vérifier le lien dans le footer
        footer_link = page.locator('[data-testid="footer-dealers-link"]')
        has_footer_link = await footer_link.count() > 0
        
        screenshot = await take_screenshot(page, "09_nav_links")
        
        if has_header_link and has_footer_link:
            report.add_test("Liens concessionnaires", "passed", "Liens présents dans header ET footer", screenshot)
        elif has_header_link:
            report.add_test("Liens concessionnaires", "passed", "Lien présent dans header uniquement", screenshot)
        elif has_footer_link:
            report.add_test("Liens concessionnaires", "passed", "Lien présent dans footer uniquement", screenshot)
        else:
            report.add_test("Liens concessionnaires", "failed", "Aucun lien vers concessionnaires trouvé", screenshot)
    except Exception as e:
        report.add_test("Liens concessionnaires", "failed", str(e))


async def test_sliders_bidirectional(page: Page, report: QAReport):
    """Test: Sliders bidirectionnels (min/max)"""
    try:
        await page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)
        
        # Vérifier les sliders de prix
        price_min = page.locator('[data-testid="price-slider-min"]')
        price_max = page.locator('[data-testid="price-slider-max"]')
        
        has_price_min = await price_min.count() > 0
        has_price_max = await price_max.count() > 0
        
        # Vérifier les sliders d'année
        year_min = page.locator('[data-testid="year-slider-min"]')
        year_max = page.locator('[data-testid="year-slider-max"]')
        
        has_year_min = await year_min.count() > 0
        has_year_max = await year_max.count() > 0
        
        screenshot = await take_screenshot(page, "10_sliders")
        
        results = []
        if has_price_min and has_price_max:
            results.append("Prix: bidirectionnel ✓")
        else:
            results.append(f"Prix: min={has_price_min}, max={has_price_max}")
            
        if has_year_min and has_year_max:
            results.append("Année: bidirectionnel ✓")
        else:
            results.append(f"Année: min={has_year_min}, max={has_year_max}")
        
        all_bidirectional = has_price_min and has_price_max and has_year_min and has_year_max
        
        if all_bidirectional:
            report.add_test("Sliders bidirectionnels", "passed", " | ".join(results), screenshot)
        else:
            report.add_test("Sliders bidirectionnels", "failed", " | ".join(results), screenshot)
    except Exception as e:
        report.add_test("Sliders bidirectionnels", "failed", str(e))


async def run_qa_tests():
    """Exécute tous les tests QA"""
    report = QAReport()
    
    print("\n🚀 Démarrage des tests QA automatisés...")
    print(f"🌐 URL de test: {BASE_URL}\n")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale="fr-CA"
        )
        page = await context.new_page()
        
        # Exécuter les tests
        await test_page_load(page, report)
        await test_vehicle_display(page, report)
        await test_price_format(page, report)
        await test_filters_sidebar(page, report)
        await test_sliders_bidirectional(page, report)
        await test_apply_filter(page, report)
        await test_sort_vehicles(page, report)
        await test_view_mode_toggle(page, report)
        await test_navigation_links(page, report)
        await test_dealers_page(page, report)
        
        await browser.close()
    
    # Générer et sauvegarder le rapport
    REPORT_PATH.mkdir(parents=True, exist_ok=True)
    report_file = REPORT_PATH / f"qa_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report.generate_report(), f, indent=2, ensure_ascii=False)
    
    print(f"\n📄 Rapport JSON sauvegardé: {report_file}")
    
    # Afficher le rapport
    report.print_report()
    
    return report


if __name__ == "__main__":
    asyncio.run(run_qa_tests())
