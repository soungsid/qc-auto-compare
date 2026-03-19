"""Unit tests for the fingerprint computation module."""

import pytest

from app.core.fingerprint import compute_fingerprint


class TestFingerprintVIN:
    """Fingerprint strategy 1 — VIN takes absolute priority."""

    def test_vin_produces_consistent_hash(self):
        fp1 = compute_fingerprint(
            vin="3N1CP5CU4RL123456",
            stock_number="A99999",
            dealer_slug="nissan-anjou",
            make="Nissan",
            model="Kicks",
            trim="S",
            year=2024,
            condition="new",
        )
        fp2 = compute_fingerprint(
            vin="3N1CP5CU4RL123456",
            stock_number="DIFFERENT",
            dealer_slug="different-dealer",
            make="Toyota",
            model="Corolla",
            trim="LE",
            year=2023,
            condition="used",
        )
        assert fp1 == fp2, "VIN alone should determine the fingerprint"

    def test_vin_case_insensitive(self):
        fp_upper = compute_fingerprint(
            vin="3N1CP5CU4RL123456", stock_number=None,
            dealer_slug="d", make="Nissan", model="Kicks", trim=None, year=2024, condition="new",
        )
        fp_lower = compute_fingerprint(
            vin="3n1cp5cu4rl123456", stock_number=None,
            dealer_slug="d", make="Nissan", model="Kicks", trim=None, year=2024, condition="new",
        )
        assert fp_upper == fp_lower

    def test_vin_wrong_length_falls_through_to_stock(self):
        """A VIN that is not 17 chars should NOT be used — fall to stock strategy."""
        fp_bad_vin = compute_fingerprint(
            vin="TOOSHORT",
            stock_number="S123",
            dealer_slug="nissan-anjou",
            make="Nissan", model="Kicks", trim="S", year=2024, condition="new",
        )
        fp_no_vin = compute_fingerprint(
            vin=None,
            stock_number="S123",
            dealer_slug="nissan-anjou",
            make="Nissan", model="Kicks", trim="S", year=2024, condition="new",
        )
        assert fp_bad_vin == fp_no_vin

    def test_different_vins_produce_different_fingerprints(self):
        kwargs = dict(stock_number=None, dealer_slug="d", make="Nissan",
                      model="Kicks", trim="S", year=2024, condition="new")
        fp1 = compute_fingerprint(vin="3N1CP5CU4RL111111", **kwargs)
        fp2 = compute_fingerprint(vin="3N1CP5CU4RL222222", **kwargs)
        assert fp1 != fp2


class TestFingerprintStock:
    """Fingerprint strategy 2 — dealer_slug + stock_number."""

    def test_stock_strategy_used_when_no_vin(self):
        fp1 = compute_fingerprint(
            vin=None, stock_number="A12345", dealer_slug="nissan-anjou",
            make="Nissan", model="Kicks", trim="S", year=2024, condition="new",
        )
        fp2 = compute_fingerprint(
            vin=None, stock_number="A12345", dealer_slug="nissan-anjou",
            make="Toyota", model="Corolla", trim="LE", year=2023, condition="used",
        )
        assert fp1 == fp2, "stock strategy: make/model/year should be ignored"

    def test_same_stock_different_dealers_differ(self):
        kwargs = dict(vin=None, stock_number="A12345",
                      make="Nissan", model="Kicks", trim="S", year=2024, condition="new")
        fp1 = compute_fingerprint(dealer_slug="nissan-anjou", **kwargs)
        fp2 = compute_fingerprint(dealer_slug="nissan-laval", **kwargs)
        assert fp1 != fp2

    def test_stock_number_without_dealer_falls_to_composite(self):
        """stock_number alone (no dealer_slug) should fall through to composite."""
        fp_no_dealer = compute_fingerprint(
            vin=None, stock_number="A12345", dealer_slug=None,
            make="Nissan", model="Kicks", trim="S", year=2024, condition="new",
        )
        fp_composite = compute_fingerprint(
            vin=None, stock_number=None, dealer_slug=None,
            make="Nissan", model="Kicks", trim="S", year=2024, condition="new",
        )
        assert fp_no_dealer == fp_composite


class TestFingerprintComposite:
    """Fingerprint strategy 3 — composite fallback."""

    def test_composite_is_deterministic(self):
        kwargs = dict(vin=None, stock_number=None, dealer_slug="nissan-anjou",
                      make="Nissan", model="Kicks", trim="S", year=2024, condition="new")
        assert compute_fingerprint(**kwargs) == compute_fingerprint(**kwargs)

    def test_composite_whitespace_normalized(self):
        fp1 = compute_fingerprint(
            vin=None, stock_number=None, dealer_slug="nissan-anjou",
            make=" Nissan ", model="Kicks ", trim=" S", year=2024, condition="new",
        )
        fp2 = compute_fingerprint(
            vin=None, stock_number=None, dealer_slug="nissan-anjou",
            make="Nissan", model="Kicks", trim="S", year=2024, condition="new",
        )
        assert fp1 == fp2

    def test_composite_returns_64_char_hex(self):
        fp = compute_fingerprint(
            vin=None, stock_number=None, dealer_slug="d",
            make="Nissan", model="Kicks", trim=None, year=2024, condition="new",
        )
        assert len(fp) == 64
        assert all(c in "0123456789abcdef" for c in fp)
