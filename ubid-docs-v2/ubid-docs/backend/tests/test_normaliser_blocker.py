"""Unit tests for normaliser and blocker modules."""
import sys
from datetime import date

import pytest

sys.path.insert(0, ".")

from backend.adapters.base import CanonicalRecord
from backend.resolution.normaliser import normalise_name, normalise_address, extract_pin
from backend.resolution.blocker import get_blocking_keys, generate_candidate_pairs


# -----------------------------------------------------------------------
# normalise_name tests
# -----------------------------------------------------------------------
class TestNormaliseName:
    """Tests for normalise_name — PRD Feature A2."""

    def test_strip_pvt_ltd(self) -> None:
        assert normalise_name("Sharma Textiles Pvt Ltd") == "SHARMA TEXTILES"

    def test_strip_p_ltd(self) -> None:
        assert normalise_name("SHARMA TEX. (P) LTD") == "SHARMA TEX"

    def test_strip_private_limited(self) -> None:
        assert normalise_name("Deccan Electronics Private Limited") == "DECCAN ELECTRONICS"

    def test_strip_llp(self) -> None:
        assert normalise_name("Mysore Silks LLP") == "MYSORE SILKS"

    def test_expand_mfg(self) -> None:
        assert normalise_name("Bangalore Mfg Works") == "BANGALORE MANUFACTURING WORKS"

    def test_expand_engg(self) -> None:
        assert normalise_name("Karnataka Engg Services") == "KARNATAKA ENGINEERING SERVICES"

    def test_expand_bros(self) -> None:
        assert normalise_name("Patil Bros Trading") == "PATIL BROTHERS TRADING"

    def test_empty_input(self) -> None:
        assert normalise_name("") == ""
        assert normalise_name(None) == ""

    def test_punctuation_stripped(self) -> None:
        result = normalise_name("A.B.C. Industries!")
        assert "." not in result
        assert "!" not in result

    def test_whitespace_collapsed(self) -> None:
        assert normalise_name("  Sharma   Textiles  ") == "SHARMA TEXTILES"


# -----------------------------------------------------------------------
# normalise_address tests
# -----------------------------------------------------------------------
class TestNormaliseAddress:
    """Tests for normalise_address — PRD Feature A2."""

    def test_expand_rd(self) -> None:
        result = normalise_address("12 MG Rd, Bengaluru")
        assert "ROAD" in result

    def test_strip_pin(self) -> None:
        result = normalise_address("45 Brigade Rd, Bengaluru 560001")
        assert "560001" not in result

    def test_extract_pin(self) -> None:
        assert extract_pin("45 Brigade Rd, Bengaluru 560001") == "560001"
        assert extract_pin("No PIN here") is None

    def test_strip_floor(self) -> None:
        result = normalise_address("Floor 3, 12 MG Rd")
        assert "FLOOR" not in result

    def test_empty_input(self) -> None:
        assert normalise_address("") == ""
        assert normalise_address(None) == ""


# -----------------------------------------------------------------------
# get_blocking_keys tests
# -----------------------------------------------------------------------
class TestBlockingKeys:
    """Tests for get_blocking_keys — TECHNICAL_SPEC section 5."""

    def test_pan_key(self) -> None:
        rec = CanonicalRecord(department="shop_est", local_id="1", pan="AABCS1234A")
        keys = get_blocking_keys(rec)
        assert "PAN:AABCS1234A" in keys

    def test_gstin_key(self) -> None:
        rec = CanonicalRecord(department="shop_est", local_id="1", gstin="29AABCS1234A1Z5")
        keys = get_blocking_keys(rec)
        assert "GST:29AABCS123" in keys

    def test_phone_key(self) -> None:
        rec = CanonicalRecord(department="shop_est", local_id="1", phone="9876543210")
        keys = get_blocking_keys(rec)
        assert "PHN:9876543210" in keys

    def test_pin_metaphone_key(self) -> None:
        rec = CanonicalRecord(
            department="shop_est", local_id="1",
            name_raw="Sharma Textiles", pin_code="560001",
        )
        keys = get_blocking_keys(rec)
        pin_keys = [k for k in keys if k.startswith("PIN:")]
        assert len(pin_keys) == 2  # MPH + PFX

    def test_no_keys_for_empty_record(self) -> None:
        rec = CanonicalRecord(department="shop_est", local_id="1")
        keys = get_blocking_keys(rec)
        assert keys == []


# -----------------------------------------------------------------------
# generate_candidate_pairs tests
# -----------------------------------------------------------------------
class TestCandidatePairs:
    """Tests for generate_candidate_pairs — PRD Feature A3."""

    def test_same_pan_produces_pair(self) -> None:
        """Two records with same PAN must always produce a shared blocking key."""
        rec_a = CanonicalRecord(
            department="shop_est", local_id="SE001",
            name_raw="Sharma Textiles", pan="AABCS1234A",
        )
        rec_b = CanonicalRecord(
            department="factories", local_id="FA001",
            name_raw="Sharma Textile Mfg", pan="AABCS1234A",
        )
        pairs = generate_candidate_pairs([rec_a, rec_b])
        assert len(pairs) == 1
        pair_depts = {pairs[0][0].department, pairs[0][1].department}
        assert pair_depts == {"shop_est", "factories"}

    def test_no_self_pairs(self) -> None:
        rec = CanonicalRecord(
            department="shop_est", local_id="SE001", pan="AABCS1234A",
        )
        pairs = generate_candidate_pairs([rec])
        assert len(pairs) == 0

    def test_linked_pairs_excluded(self) -> None:
        rec_a = CanonicalRecord(
            department="shop_est", local_id="SE001", pan="AABCS1234A",
        )
        rec_b = CanonicalRecord(
            department="factories", local_id="FA001", pan="AABCS1234A",
        )
        linked = {("factories:FA001", "shop_est:SE001")}
        pairs = generate_candidate_pairs([rec_a, rec_b], linked_pairs=linked)
        assert len(pairs) == 0

    def test_different_records_no_pair(self) -> None:
        rec_a = CanonicalRecord(
            department="shop_est", local_id="SE001",
            name_raw="Sharma Textiles", pin_code="560001",
        )
        rec_b = CanonicalRecord(
            department="factories", local_id="FA001",
            name_raw="Completely Different Business", pin_code="590099",
        )
        pairs = generate_candidate_pairs([rec_a, rec_b])
        assert len(pairs) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
