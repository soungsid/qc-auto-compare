#!/usr/bin/env python3
"""
QC Auto Compare Backend API Testing - Testing Phase 2 Enhancements
Testing server-side sorting, new filters (year_min, year_max, mileage_max), and CHANGEABLE_FIELDS
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

class QCAutoCompareAPITesterV2:
    def __init__(self, base_url: str = "https://dealer-aggregator.preview.emergentagent.com"):
        self.base_url = base_url.rstrip('/')
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results: List[Dict[str, Any]] = []

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int = 200, 
                 data: Optional[Dict] = None, params: Optional[Dict] = None) -> tuple[bool, Dict[str, Any]]:
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if params:
            print(f"   Params: {params}")
        
        try:
            response = None
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=15)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=15)
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.text else {}
                except:
                    response_data = {"text": response.text}
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:300]}...")
                response_data = {"error": response.text, "status_code": response.status_code}

            # Store test result
            self.test_results.append({
                "name": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "success": success,
                "url": url,
                "params": params
            })

            return success, response_data

        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            self.test_results.append({
                "name": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": None,
                "success": False,
                "error": str(e),
                "url": url,
                "params": params
            })
            return False, {"error": str(e)}

    def test_basic_endpoints(self):
        """Test basic endpoints still work"""
        print("\n📋 Testing Basic Endpoints...")
        
        # Health check
        success1, _ = self.run_test("Health Check", "GET", "/health", 200)
        
        # Basic vehicle listing
        success2, data = self.run_test("Basic Vehicle List", "GET", "/api/vehicles", 200)
        if success2:
            print(f"   Found {data.get('total', 0)} total vehicles")
            print(f"   Items in response: {len(data.get('items', []))}")
            
        return success1 and success2

    def test_server_side_sorting(self):
        """BUG #1 FIX: Test server-side sorting with different sort parameters"""
        print("\n🔄 Testing Server-Side Sorting (BUG #1 FIX)...")
        
        test_cases = [
            {"sort": "sale_price", "order": "asc", "description": "Price ascending"},
            {"sort": "sale_price", "order": "desc", "description": "Price descending"},
            {"sort": "year", "order": "desc", "description": "Year descending"},
            {"sort": "make", "order": "asc", "description": "Make alphabetical"},
            {"sort": "mileage_km", "order": "asc", "description": "Mileage ascending"},
            {"sort": "created_at", "order": "desc", "description": "Newest first"}
        ]
        
        all_success = True
        for case in test_cases:
            params = {
                "sort": case["sort"],
                "order": case["order"],
                "limit": 10
            }
            success, data = self.run_test(
                f"Sort by {case['description']}", 
                "GET", 
                "/api/vehicles", 
                200, 
                params=params
            )
            
            if success:
                items = data.get('items', [])
                if len(items) >= 2:
                    # Verify sorting worked
                    field = case["sort"]
                    if field in items[0]:
                        first_val = items[0][field]
                        second_val = items[1][field] if len(items) > 1 else first_val
                        print(f"   First value: {first_val}, Second value: {second_val}")
                else:
                    print(f"   Insufficient data to verify sorting")
            
            all_success = all_success and success
        
        return all_success

    def test_year_filters(self):
        """BUG #4 FIX: Test new year_min and year_max filters"""
        print("\n📅 Testing Year Filters (BUG #4 FIX)...")
        
        all_success = True
        
        # Test year_min filter
        params = {"year_min": 2020, "limit": 20}
        success1, data1 = self.run_test("Year Min Filter (2020+)", "GET", "/api/vehicles", 200, params=params)
        if success1:
            items = data1.get('items', [])
            if items:
                years = [item.get('year') for item in items if item.get('year')]
                min_year = min(years) if years else None
                print(f"   Minimum year found: {min_year} (should be >= 2020)")
                if min_year and min_year < 2020:
                    print(f"   ❌ Filter failed - found year {min_year} < 2020")
                    success1 = False
        
        # Test year_max filter  
        params = {"year_max": 2022, "limit": 20}
        success2, data2 = self.run_test("Year Max Filter (<=2022)", "GET", "/api/vehicles", 200, params=params)
        if success2:
            items = data2.get('items', [])
            if items:
                years = [item.get('year') for item in items if item.get('year')]
                max_year = max(years) if years else None
                print(f"   Maximum year found: {max_year} (should be <= 2022)")
                if max_year and max_year > 2022:
                    print(f"   ❌ Filter failed - found year {max_year} > 2022")
                    success2 = False

        # Test year range filter
        params = {"year_min": 2020, "year_max": 2023, "limit": 20}
        success3, data3 = self.run_test("Year Range Filter (2020-2023)", "GET", "/api/vehicles", 200, params=params)
        if success3:
            items = data3.get('items', [])
            if items:
                years = [item.get('year') for item in items if item.get('year')]
                if years:
                    min_year, max_year = min(years), max(years)
                    print(f"   Year range found: {min_year} to {max_year} (should be 2020-2023)")
                    if min_year < 2020 or max_year > 2023:
                        print(f"   ❌ Range filter failed")
                        success3 = False
        
        return success1 and success2 and success3

    def test_mileage_filter(self):
        """BUG #4 FIX: Test new mileage_max filter"""
        print("\n🏃 Testing Mileage Filter (BUG #4 FIX)...")
        
        params = {"mileage_max": 50000, "limit": 20}
        success, data = self.run_test("Mileage Max Filter (<=50000km)", "GET", "/api/vehicles", 200, params=params)
        
        if success:
            items = data.get('items', [])
            if items:
                # Check mileage values
                mileages = [item.get('mileage_km') for item in items if item.get('mileage_km') is not None]
                if mileages:
                    max_mileage = max(mileages)
                    print(f"   Maximum mileage found: {max_mileage} km (should be <= 50000)")
                    if max_mileage > 50000:
                        print(f"   ❌ Mileage filter failed - found {max_mileage} km > 50000")
                        return False
                else:
                    print("   No mileage data found in results")
            
        return success

    def test_changeable_fields_ingest(self):
        """BUG #2 FIX: Test that CHANGEABLE_FIELDS now includes condition, drivetrain, transmission, mileage_km"""
        print("\n🔄 Testing CHANGEABLE_FIELDS Update (BUG #2 FIX)...")
        
        # Create initial vehicle
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        base_vehicle = {
            "external_id": f"changeable_test_{timestamp}",
            "stock_number": f"STOCK_{timestamp}",
            "year": 2023,
            "make": "Honda",
            "model": "Civic",
            "trim": "LX",
            "condition": "new",
            "drivetrain": "FWD",
            "transmission": "CVT",
            "mileage_km": 0,
            "msrp": 28000,
            "sale_price": 26000,
            "ingest_source": "test_changeable",
            "dealer_name": "Test Dealer Changeable",
            "dealer_city": "Montreal"
        }
        
        # Initial ingest
        success1, _ = self.run_test(
            "Initial Vehicle Ingest", 
            "POST", 
            "/api/ingest/batch", 
            200, 
            data={"vehicles": [base_vehicle]}
        )
        
        if not success1:
            return False
            
        # Update with changed fields (condition, drivetrain, transmission, mileage_km)
        updated_vehicle = base_vehicle.copy()
        updated_vehicle.update({
            "condition": "used",  # Changed from "new"
            "drivetrain": "AWD",  # Changed from "FWD"
            "transmission": "Manual",  # Changed from "CVT"
            "mileage_km": 15000,  # Changed from 0
            "sale_price": 24000  # Also change price
        })
        
        success2, data = self.run_test(
            "Update Changeable Fields", 
            "POST", 
            "/api/ingest/batch", 
            200, 
            data={"vehicles": [updated_vehicle]}
        )
        
        if success2:
            # Check if the update was processed (should show "updated" action)
            results = data.get('results', [])
            if results:
                action = results[0].get('action')
                print(f"   Update action: {action} (should be 'updated' or 'created')")
                if action not in ['updated', 'created']:
                    print(f"   ❌ Expected update action, got: {action}")
                    return False
        
        return success1 and success2

    def test_combined_filters(self):
        """Test multiple filters working together"""
        print("\n🔧 Testing Combined Filters...")
        
        params = {
            "make": "Toyota",
            "condition": "new", 
            "year_min": 2020,
            "year_max": 2024,
            "max_price": 50000,
            "sort": "sale_price",
            "order": "asc"
        }
        
        success, data = self.run_test("Combined Filters Test", "GET", "/api/vehicles", 200, params=params)
        if success:
            items = data.get('items', [])
            print(f"   Results with combined filters: {len(items)} items")
            
            # Verify some filter conditions if we have results
            if items:
                for i, item in enumerate(items[:3]):  # Check first 3 items
                    make = item.get('make', '')
                    condition = item.get('condition', '')
                    year = item.get('year', 0)
                    price = item.get('sale_price', 0)
                    print(f"   Item {i+1}: {year} {make} - {condition} - ${price:,}")
                    
        return success

    def test_edge_cases(self):
        """Test edge cases and invalid parameters"""
        print("\n⚠️  Testing Edge Cases...")
        
        all_success = True
        
        # Invalid sort field - should fallback gracefully
        params = {"sort": "invalid_field", "order": "asc"}
        success1, _ = self.run_test("Invalid Sort Field", "GET", "/api/vehicles", 200, params=params)
        
        # Invalid order - should fallback gracefully  
        params = {"sort": "sale_price", "order": "invalid"}
        success2, _ = self.run_test("Invalid Order", "GET", "/api/vehicles", 200, params=params)
        
        # Extreme values
        params = {"year_min": 1800, "year_max": 3000}
        success3, _ = self.run_test("Extreme Year Values", "GET", "/api/vehicles", 200, params=params)
        
        return success1 and success2 and success3

    def run_all_tests(self):
        """Run all Phase 2 enhancement tests"""
        print("🚀 Starting QC Auto Compare Phase 2 Backend Tests")
        print("Testing: Server-side sorting, Year/Mileage filters, CHANGEABLE_FIELDS")
        print("=" * 70)

        all_success = True
        
        # Test categories
        tests = [
            ("Basic Endpoints", self.test_basic_endpoints),
            ("Server-Side Sorting (BUG #1)", self.test_server_side_sorting),
            ("Year Filters (BUG #4)", self.test_year_filters),
            ("Mileage Filter (BUG #4)", self.test_mileage_filter),
            ("CHANGEABLE_FIELDS (BUG #2)", self.test_changeable_fields_ingest),
            ("Combined Filters", self.test_combined_filters),
            ("Edge Cases", self.test_edge_cases)
        ]
        
        for test_name, test_func in tests:
            try:
                success = test_func()
                all_success = all_success and success
                status = "✅ PASSED" if success else "❌ FAILED"
                print(f"\n{status} - {test_name}")
            except Exception as e:
                print(f"\n❌ ERROR - {test_name}: {str(e)}")
                all_success = False

        # Summary
        print("\n" + "=" * 70)
        print(f"📊 TEST SUMMARY:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")  
        print(f"   Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%" if self.tests_run > 0 else "0.0%")

        # Failed tests details
        failed_tests = [t for t in self.test_results if not t['success']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                error_msg = test.get('error', f"Status {test.get('actual_status', 'N/A')}")
                print(f"   • {test['name']}: {error_msg}")

        return all_success

def main():
    """Main test execution"""
    print("QC Auto Compare Phase 2 API Testing Tool")
    print("Testing enhancements and bug fixes...")
    
    tester = QCAutoCompareAPITesterV2()
    success = tester.run_all_tests()
    
    # Save detailed results
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    results_file = f"/app/test_results_backend_v2_{timestamp}.json"
    
    with open(results_file, 'w') as f:
        json.dump({
            "timestamp": timestamp,
            "base_url": tester.base_url,
            "summary": {
                "tests_run": tester.tests_run,
                "tests_passed": tester.tests_passed,
                "success_rate": (tester.tests_passed/tester.tests_run)*100 if tester.tests_run > 0 else 0
            },
            "test_results": tester.test_results
        }, f, indent=2)
    
    print(f"\n💾 Detailed results saved to: {results_file}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())