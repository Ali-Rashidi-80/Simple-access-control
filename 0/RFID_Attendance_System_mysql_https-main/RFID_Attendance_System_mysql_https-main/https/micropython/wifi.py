import network  # برای اتصال به شبکه WiFi
from time import sleep, time  # وارد کردن توابع sleep و time برای مدیریت زمان


# تنظیمات اتصال به WiFi
ssid = "SAMSUNG"  # نام شبکه WiFi
password = "panzer790"  # رمز عبور شبکه WiFi

# ایجاد شیء WLAN برای حالت STA (ایستگاه)
wlan = network.WLAN(network.STA_IF)  
wlan.active(True)  # فعال کردن WLAN

# تابع برای اتصال به WiFi
def connect_wifi():
    global wlan  # دسترسی به شیء wlan در سطح جهانی
    
    try:
        # تلاش برای اتصال به شبکه WiFi با استفاده از SSID و رمز عبور
        wlan.connect(ssid, password)  
        timeout = 10  # زمان خروجی برای تلاش در اتصال به WiFi به ثانیه
        start_time = time()  # زمان شروع تلاش برای اتصال

        # تلاش برای اتصال تا زمانی که به WiFi متصل شویم یا زمان منقضی شود
        while not wlan.isconnected() and (time() - start_time < timeout):  
            sleep(3)  # خوابیدن برای 3 ثانیه
            print("Connecting...")  # نمایش پیام اتصال
            

        if wlan.isconnected():
            ip_address = wlan.ifconfig()[0]  # دریافت آدرس IP پس از اتصال موفق
            print(f"\nConnected: {ip_address}")  # نمایش آدرس IP
            return True  # بازگشت مقدار True در صورت موفقیت در اتصال
        else:
            print("\nFailed to connect to WiFi")  # نمایش پیام در صورت عدم موفقیت
            return False  # بازگشت مقدار False در صورت عدم موفقیت

    except OSError as e:
        print(f"WiFi Internal Error: {e}")  # نمایش خطا در صورت بروز مشکل داخلی
        return False  # بازگشت مقدار False برای ادامه برنامه به صورت آفلاین
    except Exception as e:
        print("An unexpected error occurred: ", e)  # نمایش خطای غیرمنتظره

        
# تابع برای اطمینان از اتصال WiFi در صورت قطع اتصال
def ensure_wifi_connection():
    wlan = network.WLAN(network.STA_IF)  # ایجاد شیء WLAN
    if not wlan.isconnected():  # بررسی وضعیت اتصال WiFi
        print("\nWiFi disconnected. Attempting to reconnect...")  # نمایش پیام در صورت قطع اتصال

        
        try:
            wlan.active(True)  # اطمینان از فعال بودن WLAN
            if not wlan.isconnected():  # بررسی دوباره اتصال WiFi
                wlan.connect(ssid, password)  # تلاش برای اتصال دوباره
                timeout = 10  # زمان خروجی برای تلاش در اتصال به WiFi به ثانیه
                start_time = time()  # زمان شروع تلاش برای اتصال

                # تلاش برای اتصال تا زمانی که به WiFi متصل شویم یا زمان منقضی شود
                while not wlan.isconnected() and (time() - start_time < timeout):  
                    sleep(3)  # خوابیدن برای 3 ثانیه
                    print(".", end="")  # نمایش نقطه برای نشان دادن تلاش در اتصال


                if wlan.isconnected():
                    print("\nReconnected to WiFi: ", wlan.ifconfig()[0])  # نمایش آدرس IP پس از اتصال مجدد
                else:
                    print("\nFailed to reconnect to WiFi")  # نمایش پیام در صورت عدم موفقیت

        except Exception as e:
            print("Exception during WiFi reconnection: ", e)  # نمایش خطا در صورت بروز مشکل



