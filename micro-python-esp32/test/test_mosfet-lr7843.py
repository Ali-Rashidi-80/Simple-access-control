from machine import Pin
import time

# تعریف پین متصل به پایه SIG ماژول
# شماره پین را بر اساس برد خود تغییر دهید (مثلاً 5 برای D1 در برخی بردهای ESP8266)
mosfet_pin = Pin(15, Pin.OUT)

def turn_on():
    print("MOSFET ON")
    mosfet_pin.value(1) # روشن کردن

def turn_off():
    print("MOSFET OFF")
    mosfet_pin.value(0) # خاموش کردن

# حلقه تست ساده
while True:
    turn_on()
    time.sleep(2) # دو ثانیه روشن بماند
    
    turn_off()
    time.sleep(2) # دو ثانیه خاموش بماند