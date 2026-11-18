"""
Live Melipayamak SMS script — opt-in only (does not run in default pytest).
Set RUN_LIVE_SMS=1 to execute.
"""

import os
import sys

import pytest
from dotenv import load_dotenv

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_LIVE_SMS", "").lower() not in ("1", "true", "yes"),
    reason="Live SMS test quarantined; set RUN_LIVE_SMS=1 to run",
)

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

project_root = os.path.dirname(backend_dir)
load_dotenv(os.path.join(project_root, ".env"))

SMS_USERNAME = os.getenv("SMS_USERNAME")
SMS_PASSWORD = os.getenv("SMS_PASSWORD")
SMS_SENDER_NUMBER = os.getenv("SMS_SENDER_NUMBER")

TEST_PHONE = os.getenv("TEST_SMS_PHONE", "09120000001")
TEST_MESSAGE = """SentryGate test SMS"""


def test_live_sms_send():
    from app.services.melipayamak import Api

    assert SMS_USERNAME and SMS_PASSWORD and SMS_SENDER_NUMBER
    api = Api(SMS_USERNAME, SMS_PASSWORD)
    sms = api.sms()
    result = sms.send(TEST_PHONE, SMS_SENDER_NUMBER, TEST_MESSAGE)
    assert result is not None
