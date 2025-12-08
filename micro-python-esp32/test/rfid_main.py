from mfrc522 import MFRC522
import network
import urequests as requests
import time
import machine  # برای کنترل GPIO
import wifi
import gc









# ایجاد شی WLAN برای مدیریت اتصال به شبکه WiFi
wlan = network.WLAN(network.STA_IF) 
wlan.active(True)  # فعال کردن WLAN

# تنظیمات WiFi
ssid = "SAMSUNG"
password = "panzer790"
server_url = ""





# پین‌های SPI و RFID
sck_pin = 18   # برای SPI SCK
miso_pin = 19   # برای SPI MISO
mosi_pin = 22   # برای SPI MOSI
cs_pin = 5     # برای SPI CS (SDA در کد شما)
rst_pin = 4    # برای RST

# تنظیمات RFID
reader = MFRC522(spi_id=0, sck=sck_pin, miso=miso_pin, mosi=mosi_pin, cs=cs_pin, rst=rst_pin)





# اتصال به WiFi
def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(ssid, password)
    print("Connecting to WiFi...")

    
    while not wlan.isconnected():
        print("Waiting for WiFi connection...")
        time.sleep(1)
    
    print("Connected to WiFi")
    print("IP Address:", wlan.ifconfig()[0])








# ارسال داده به سرور
def send_data_to_server(card_id):
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    payload = 'id=' + card_id
    retries = 0
    max_retries = 5

    while retries < max_retries:
        try:
            print(f"Sending data to server: {payload}")
            response = requests.post(server_url, headers=headers, data=payload)
            print("Received response status code:", response.status_code)

            if response.status_code == 200:
                print("Data sent successfully:", response.text)
                return  # موفقیت آمیز، برگرد به حلقه اصلی
            
            else:
                print("Error: Unexpected status code:", response.status_code)


        except Exception as e:
            print("HTTP request failed:", e)


        retries += 1
        wait_time = 2 ** retries  # Exponential backoff
        print(f"Retrying in {wait_time} seconds... (Attempt {retries}/{max_retries})")
        time.sleep(wait_time)

    print("Max retries reached. Moving to next tag.")



# بازنشانی خواننده RFID
def reset_reader():
    print("Resetting RFID reader...")
    reader.init()
    time.sleep(0.5)  # وقفه کوتاه برای بازنشانی کامل










# اجرای برنامه
def main():
    global wlan
    
    # اطمینان از اتصال به WiFi
    while not wlan.isconnected():
        wifi.connect_wifi()  # تلاش برای اتصال به WiFi
        time.sleep(2)  # زمان انتظار برای تلاش مجدد
    
    connect_wifi()
    print("Bring TAG closer...")

    tag_detected = False  # Flag for tag detection
    sending_data = False  # Flag for sending data

    while True:
        try:
            if wlan.isconnected():  # بررسی وضعیت اتصال WiFi
                
                # اطمینان از اتصال WiFi
                wifi.ensure_wifi_connection()  # بررسی و اطمینان از اتصال WiFi
                
                reset_reader()  # بازنشانی RFID برای کارت بعدی
                print("Looking for a tag...")
                (stat, tag_type) = reader.request(reader.REQIDL)

                if stat == reader.OK:
                    if not sending_data:  # فقط در صورتی که در حال ارسال داده نباشیم
                        if not tag_detected:  # اگر کارت شناسایی نشده باشد
                            print("Tag detected. Attempting to read UID...")
                            tag_detected = True  # Set the flag to true
                        (stat, uid) = reader.SelectTagSN()
                        if stat == reader.OK:
                            card_id = ''.join(['%02X' % byte for byte in uid])  # تبدیل بایت‌ها به رشته هگزا
                            print("CARD ID:", card_id)
                            sending_data = True  # Set sending data flag to true
                            send_data_to_server(card_id)  # ارسال داده به سرور
                            sending_data = False  # Reset sending data flag

                else:
                    if tag_detected:
                        print("No tag detected. Waiting...")
                        tag_detected = False  # Reset the flag if no tag is detected
                time.sleep(3)  # وقفه 3 ثانیه برای کنترل تکرار
                gc.collect()  # جمع‌آوری زباله‌ها
            
            
            else:
                print("WiFi is disconnected. Trying to reconnect...")
                wifi.connect_wifi()  # تلاش مجدد برای اتصال به WiFi
                time.sleep(3)  # زمان انتظار قبل از تلاش مجدد
        
        
        
        except KeyboardInterrupt:
            print("Program was manually interrupted")
            break  
        except Exception as e:
            print("Unexpected error occurred: ", e)  # مدیریت خطاهای غیرمنتظره
            time.sleep(2)  # زمان انتظار برای جلوگیری از حمله سریع خطا

if __name__ == "__main__":
    main()



