"""
Simple SMS Test Script
Tests MeliPayamak SMS sending to real phone number
"""

import os
import sys

# Add parent directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

# Load environment variables from project root
from dotenv import load_dotenv

project_root = os.path.dirname(backend_dir)  # Sentrygateuiuxdesign folder
env_path = os.path.join(project_root, ".env")
print(f"Loading .env from: {env_path}")
load_dotenv(env_path)

from app.services.melipayamak import Api

# Configuration
SMS_USERNAME = os.getenv("SMS_USERNAME")
SMS_PASSWORD = os.getenv("SMS_PASSWORD")
SMS_SENDER_NUMBER = os.getenv("SMS_SENDER_NUMBER")

TEST_PHONE = "09204963846"  # Your test number
TEST_MESSAGE = """🔐 SentryGate تست

این یک پیامک تست است.
اگر این پیام را دریافت کردید، سیستم SMS به درستی کار می‌کند.

کد تست: 123456
"""

import pytest


def test_sms():
    print("=" * 50)
    print("🔍 تست ارسال پیامک MeliPayamak")
    print("=" * 50)

    print("\n📋 تنظیمات:")
    print(f"   Username: {SMS_USERNAME}")
    print(f"   Password: {'*' * len(SMS_PASSWORD) if SMS_PASSWORD else 'NOT SET'}")
    print(f"   Sender: {SMS_SENDER_NUMBER}")
    print(f"   Target: {TEST_PHONE}")

    if not all([SMS_USERNAME, SMS_PASSWORD, SMS_SENDER_NUMBER]):
        pytest.skip("تنظیمات SMS در فایل .env یافت نشد یا ناقص است")

    try:
        print("\n📤 در حال ارسال پیامک...")

        api = Api(SMS_USERNAME, SMS_PASSWORD)
        sms = api.sms()
        response = sms.send(TEST_PHONE, SMS_SENDER_NUMBER, TEST_MESSAGE)

        print("\n📨 پاسخ API:")
        print(f"   {response}")

        assert response and "error" not in str(response).lower(), f"SMS send failed: {response}"

    except Exception as e:
        pytest.fail(f"خطا در ارسال پیامک: {e}")


if __name__ == "__main__":
    test_sms()
