#!/usr/bin/env python3
"""
Backend API Testing for QC Auto Compare
Tests all backend APIs using the public endpoint.
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

class QCAutoCompareAPITester:
    def __init__(self, base_url: str = "https://7bc22109-d5aa-4f60-9e7b-2484a1ddf954.preview.emergentagent.com"):
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
        
        try:
            response = None
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            
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
                print(f"   Response: {response.text[:200]}...")
                response_data = {"error": response.text, "status_code": response.status_code}

            # Store test result
            self.test_results.append({
                "name": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "success": success,
                "url": url
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
                "url": url
            })
            return False, {"error": str(e)}

    def test_health_endpoint(self):
        """Test the health check endpoint"""
        return self.run_test("Health Check", "GET", "/health", 200)

    def test_vehicles_list(self):
        """Test vehicles listing endpoint with pagination"""
        success, data = self.run_test("Vehicle List", "GET", "/api/vehicles", 200)
        if success:
            print(f"   Found {data.get('total', 0)} total vehicles")
            print(f"   Items in response: {len(data.get('items', []))}")
        return success, data

    def test_vehicles_with_filters(self):
        """Test vehicles endpoint with filters"""
        params = {
            "make": "Toyota",
            "condition": "new",
            "page": 1,
            "limit": 10
        }
        success, data = self.run_test("Vehicle List with Filters", "GET", "/api/vehicles", 200, params=params)
        if success:
            print(f"   Filtered results: {len(data.get('items', []))} items")
        return success, data

    def test_crawl_stats(self):
        """Test crawl statistics endpoint"""
        success, data = self.run_test("Crawl Stats", "GET", "/api/crawl/stats", 200)
        if success:
            print(f"   Active vehicles: {data.get('active_vehicles', 'N/A')}")
            print(f"   Total dealers: {data.get('total_dealers', 'N/A')}")
        return success, data

    def test_ingest_batch_endpoint(self):
        """Test vehicle ingest batch endpoint"""
        # Test with sample vehicle data
        sample_data = {
            "vehicles": [
                {
                    "external_id": f"test_vehicle_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    "year": 2024,
                    "make": "Toyota",
                    "model": "Camry",
                    "trim": "LE",
                    "drivetrain": "FWD",
                    "msrp": 35000,
                    "sale_price": 32000,
                    "condition": "new",
                    "ingest_source": "test",
                    "dealer": {
                        "name": "Test Dealer",
                        "city": "Montreal",
                        "phone": "514-555-0123"
                    }
                }
            ]
        }
        return self.run_test("Ingest Batch", "POST", "/api/ingest/batch", 200, data=sample_data)

    def test_dealers_endpoint(self):
        """Test dealers endpoint"""
        return self.run_test("Dealers List", "GET", "/api/dealers", 200)

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting QC Auto Compare Backend API Tests")
        print("=" * 60)

        # Core functionality tests
        print("\n📋 Testing Core APIs...")
        self.test_health_endpoint()
        self.test_vehicles_list()
        self.test_vehicles_with_filters()
        self.test_crawl_stats()
        self.test_dealers_endpoint()

        # Data ingestion tests
        print("\n📤 Testing Data Ingestion...")
        self.test_ingest_batch_endpoint()

        # Summary
        print("\n" + "=" * 60)
        print(f"📊 TEST SUMMARY:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")

        # Failed tests details
        failed_tests = [t for t in self.test_results if not t['success']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                error_msg = test.get('error', f"Status {test.get('actual_status', 'N/A')}")
                print(f"   • {test['name']}: {error_msg}")

        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    print("QC Auto Compare API Testing Tool")
    print("Testing against public endpoint...")
    
    tester = QCAutoCompareAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    results_file = f"/app/test_results_backend_{timestamp}.json"
    
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