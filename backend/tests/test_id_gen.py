from datetime import date

import pytest

from app.id_gen import make_description, make_id_raqam


def test_id_format():
    assert make_id_raqam("БР", "1703401", date(2026, 3, 12)) == "БР-1703401-2026"


def test_id_year_comes_from_approval_date():
    assert make_id_raqam("ҚР", "1703401", date(2019, 12, 31)).endswith("-2019")


@pytest.mark.parametrize("turi,soato", [("XX", "1703401"), ("БР", "170340"), ("БР", "17034O1")])
def test_id_rejects_bad_input(turi, soato):
    with pytest.raises(ValueError):
        make_id_raqam(turi, soato, date(2026, 1, 1))


def test_description_short_kept():
    assert make_description("БР-1703401-2026", "Bosh reja") == "БР-1703401-2026 | Bosh reja"


def test_description_truncated_to_75():
    d = make_description("БР-1703401-2026", "x" * 200)
    assert len(d) == 75
    assert d.startswith("БР-1703401-2026 | ")
