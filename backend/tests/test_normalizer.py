"""Unit tests for the data normalization module."""

import pytest

from app.core.normalizer import (
    normalize_condition,
    normalize_drivetrain,
    normalize_make,
    normalize_payment_frequency,
    normalize_price,
    normalize_transmission,
    normalize_vin,
)


class TestNormalizeDrivetrain:
    def test_fwd_variants(self):
        for v in ["fwd", "FWD", "traction avant", "2wd", "front wheel drive"]:
            assert normalize_drivetrain(v) == "FWD", f"Failed for: {v!r}"

    def test_awd_variants(self):
        for v in ["awd", "AWD", "4x4", "intégral", "all wheel drive", "quattro"]:
            assert normalize_drivetrain(v) == "AWD", f"Failed for: {v!r}"

    def test_rwd_variants(self):
        for v in ["rwd", "RWD", "propulsion", "rear wheel drive"]:
            assert normalize_drivetrain(v) == "RWD", f"Failed for: {v!r}"

    def test_4wd_variants(self):
        for v in ["4wd", "4WD", "4rm"]:
            assert normalize_drivetrain(v) == "4WD", f"Failed for: {v!r}"

    def test_none_returns_none(self):
        assert normalize_drivetrain(None) is None
        assert normalize_drivetrain("") is None

    def test_unknown_returns_none(self):
        assert normalize_drivetrain("turbo") is None


class TestNormalizeTransmission:
    def test_automatic_variants(self):
        for v in ["automatic", "automatique", "auto", "CVT", "AT"]:
            assert normalize_transmission(v) == "automatic", f"Failed for: {v!r}"

    def test_manual_variants(self):
        for v in ["manual", "manuelle", "MT", "6-speed manual"]:
            assert normalize_transmission(v) == "manual", f"Failed for: {v!r}"

    def test_none_returns_none(self):
        assert normalize_transmission(None) is None


class TestNormalizePrice:
    def test_numeric_int(self):
        assert normalize_price(29995) == 29995.0

    def test_numeric_float(self):
        assert normalize_price(29995.50) == 29995.50

    def test_string_with_dollar(self):
        assert normalize_price("$29,995") == 29995.0

    def test_string_with_spaces(self):
        assert normalize_price("29 995 $") == 29995.0

    def test_zero_returns_none(self):
        assert normalize_price(0) is None

    def test_none_returns_none(self):
        assert normalize_price(None) is None

    def test_unparseable_returns_none(self):
        assert normalize_price("N/A") is None


class TestNormalizePaymentFrequency:
    def test_monthly_variants(self):
        for v in ["monthly", "mensuel", "mensuelle", "/mois", "par mois"]:
            assert normalize_payment_frequency(v) == "monthly", f"Failed for: {v!r}"

    def test_biweekly_variants(self):
        for v in ["biweekly", "bi-weekly", "aux 2 semaines"]:
            assert normalize_payment_frequency(v) == "biweekly", f"Failed for: {v!r}"

    def test_weekly_variants(self):
        for v in ["weekly", "hebdomadaire", "par semaine"]:
            assert normalize_payment_frequency(v) == "weekly", f"Failed for: {v!r}"


class TestNormalizeMake:
    def test_known_makes(self):
        assert normalize_make("nissan") == "Nissan"
        assert normalize_make("TOYOTA") == "Toyota"
        assert normalize_make("chevy") == "Chevrolet"
        assert normalize_make("vw") == "Volkswagen"
        assert normalize_make("mercedes-benz") == "Mercedes-Benz"

    def test_unknown_make_title_cased(self):
        assert normalize_make("rivian") == "Rivian"

    def test_none_returns_none(self):
        assert normalize_make(None) is None


class TestNormalizeCondition:
    def test_new_variants(self):
        for v in ["new", "neuf", "neuve", "nouveau"]:
            assert normalize_condition(v) == "new"

    def test_used_variants(self):
        for v in ["used", "usagé", "occasion"]:
            assert normalize_condition(v) == "used"

    def test_certified_variants(self):
        for v in ["certified", "certifié", "cpo"]:
            assert normalize_condition(v) == "certified"

    def test_none_defaults_to_new(self):
        assert normalize_condition(None) == "new"


class TestNormalizeVIN:
    def test_valid_vin(self):
        assert normalize_vin("3n1cp5cu4rl123456") == "3N1CP5CU4RL123456"

    def test_strips_spaces(self):
        assert normalize_vin("  3N1CP5CU4RL123456  ") == "3N1CP5CU4RL123456"

    def test_short_vin_returns_none(self):
        assert normalize_vin("TOOSHORT") is None

    def test_none_returns_none(self):
        assert normalize_vin(None) is None
