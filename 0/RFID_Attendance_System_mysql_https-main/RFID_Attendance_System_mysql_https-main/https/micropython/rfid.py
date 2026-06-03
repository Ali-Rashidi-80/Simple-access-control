from mfrc522 import MFRC522
import network
import urequests as requests
import time
import machine  # برای کنترل GPIO
import wifi
import gc




# تعریف پین‌های LED
red_led = machine.Pin(0, machine.Pin.OUT)    # LED قرمز
green_led = machine.Pin(2, machine.Pin.OUT)  # LED سبز
blue_led = machine.Pin(15, machine.Pin.OUT)   # LED آبی
red_led.off()   # خاموش کردن LED قرمز
green_led.off()
blue_led.off()  # خاموش کردن LED آبی





# ایجاد شی WLAN برای مدیریت اتصال به شبکه WiFi
wlan = network.WLAN(network.STA_IF) 
wlan.active(True)  # فعال کردن WLAN

# تنظیمات WiFi
ssid = "SAMSUNG"
password = "panzer790"
server_url = "https://www.rash32.ir/Attendance_System/manager/EmployeeAttendanceReports/data.php"





# پین‌های SPI و RFID
sck_pin = 18   # برای SPI SCK
miso_pin = 19   # برای SPI MISO
mosi_pin = 23   # برای SPI MOSI
cs_pin = 27     # برای SPI CS (SDA در کد شما)
rst_pin = 25    # برای RST

# تنظیمات RFID
reader = MFRC522(spi_id=0, sck=sck_pin, miso=miso_pin, mosi=mosi_pin, cs=cs_pin, rst=rst_pin)





# اتصال به WiFi
def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    wlan.connect(ssid, password)
    print("Connecting to WiFi...")
    red_led.on()
    blue_led.on()
    
    while not wlan.isconnected():
        print("Waiting for WiFi connection...")
        red_led.off()
        blue_led.on()
        time.sleep(1)
    
    print("Connected to WiFi")
    print("IP Address:", wlan.ifconfig()[0])
    red_led.off()
    blue_led.off()
    
    green_led.on()  # روشن کردن LED سبز هنگام اتصال موفق به WiFi
    time.sleep(3)
    green_led.off()






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
                # افکت ترکیبی چراغ‌ها پس از ارسال موفقیت‌آمیز داده
                success_White_effect()
                return  # موفقیت آمیز، برگرد به حلقه اصلی
            
            else:
                print("Error: Unexpected status code:", response.status_code)
                red_led.on()  # روشن کردن LED قرمز در صورت خطا


        except Exception as e:
            print("HTTP request failed:", e)
            red_led.on()  # روشن کردن LED قرمز در صورت بروز خطا


        retries += 1
        wait_time = 2 ** retries  # Exponential backoff
        print(f"Retrying in {wait_time} seconds... (Attempt {retries}/{max_retries})")
        time.sleep(wait_time)

    print("Max retries reached. Moving to next tag.")
    red_led.on()
    green_led.on()
    time.sleep(2)
    red_led.off()
    green_led.off()



# بازنشانی خواننده RFID
def reset_reader():
    print("Resetting RFID reader...")
    reader.init()
    time.sleep(0.5)  # وقفه کوتاه برای بازنشانی کامل





# افکت تنفس (Breathing Effect) برای LED‌ها
def success_White_effect():
    pwm_green = machine.PWM(green_led)
    pwm_red = machine.PWM(red_led)
    pwm_blue = machine.PWM(blue_led)
    
    for _ in range(3):  # افکت سه بار تکرار می‌شود
        for duty in range(0, 1024, 64):  # افزایش شدت نور
            pwm_green.duty(duty)
            pwm_red.duty(duty)
            pwm_blue.duty(duty)
            time.sleep(0.01)
        
        for duty in range(1023, -1, -64):  # کاهش شدت نور
            pwm_green.duty(duty)
            pwm_red.duty(duty)
            pwm_blue.duty(duty)
            time.sleep(0.01)
    
    pwm_green.deinit()
    pwm_red.deinit()
    pwm_blue.deinit()







# اجرای برنامه
def main():
    global wlan
    
    # اطمینان از اتصال به WiFi
    while not wlan.isconnected():
        wifi.connect_wifi()  # تلاش برای اتصال به WiFi
        red_led.on()
        blue_led.on()
        time.sleep(2)  # زمان انتظار برای تلاش مجدد
    
    connect_wifi()
    print("Bring TAG closer...")

    tag_detected = False  # Flag for tag detection
    sending_data = False  # Flag for sending data

    while True:
        try:
            if wlan.isconnected():  # بررسی وضعیت اتصال WiFi
                red_led.off()
                blue_led.off()
                
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
                        red_led.on()
                        green_led.on()
                        time.sleep(1)
                        red_led.off()
                        green_led.off()
                time.sleep(3)  # وقفه 3 ثانیه برای کنترل تکرار
                gc.collect()  # جمع‌آوری زباله‌ها
            
            
            else:
                print("WiFi is disconnected. Trying to reconnect...")
                red_led.on()
                blue_led.on()
                wifi.connect_wifi()  # تلاش مجدد برای اتصال به WiFi
                time.sleep(3)  # زمان انتظار قبل از تلاش مجدد
        
        
        
        except KeyboardInterrupt:
            print("Program was manually interrupted")
            red_led.on()
            break  
        except Exception as e:
            print("Unexpected error occurred: ", e)  # مدیریت خطاهای غیرمنتظره
            red_led.on()
            time.sleep(2)  # زمان انتظار برای جلوگیری از حمله سریع خطا

if __name__ == "__main__":
    main()


