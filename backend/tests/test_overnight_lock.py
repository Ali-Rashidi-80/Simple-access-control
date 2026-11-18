"""Unit tests for overnight auto-lock window helper."""

from app.services.processor import is_hour_in_secure_window


def test_overnight_window_22_to_6():
    assert is_hour_in_secure_window(22, 22, 6) is True
    assert is_hour_in_secure_window(23, 22, 6) is True
    assert is_hour_in_secure_window(0, 22, 6) is True
    assert is_hour_in_secure_window(3, 22, 6) is True
    assert is_hour_in_secure_window(5, 22, 6) is True
    assert is_hour_in_secure_window(6, 22, 6) is False
    assert is_hour_in_secure_window(10, 22, 6) is False
    assert is_hour_in_secure_window(21, 22, 6) is False


def test_same_day_window_9_to_17():
    assert is_hour_in_secure_window(9, 9, 17) is True
    assert is_hour_in_secure_window(12, 9, 17) is True
    assert is_hour_in_secure_window(16, 9, 17) is True
    assert is_hour_in_secure_window(17, 9, 17) is False
    assert is_hour_in_secure_window(8, 9, 17) is False
