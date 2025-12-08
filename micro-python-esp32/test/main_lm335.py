# LM335 – نسخهٔ نهایی، تمیز و دقیق (بدون مقاومت، فقط سه سیم)
from machine import Pin, ADC
from time import sleep

adc = ADC(Pin(34))
adc.atten(ADC.ATTN_11DB)

# این عدد دقیقاً برای برد ESP32 تو کالیبره شده (تا آخرین تست تو)
VREF = 3.580       # ← فقط این عدد را نگه دار، دیگر دست نزن!

def read_temp():
    total = 0
    for _ in range(25):
        total += adc.read_u16()
        sleep(0.005)
    raw = total / 25
    voltage = raw * VREF / 65535
    celsius = voltage * 100 - 273.15
    return round(raw), round(voltage, 3), round(celsius, 2)

#print("دما‌سنج LM335 – دقیق و آماده!\n")
#print("      دما         ولتاژ     خام")

while True:
    raw, volt, temp = read_temp()
    #print(f"   {temp:+7.2f} °C     {volt:.3f} V    {raw:5.0f}")
    print(f"{temp:+7.2f} °C")
    sleep(1)