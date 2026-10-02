from machine import Pin, ADC
from time import sleep

adc = ADC(Pin(34))
adc.atten(ADC.ATTN_11DB)

print("تست اتصال LM335 – فقط پایه وسط به ADC باشد!\n")
print("خام     ولتاژ")

while True:
    raw = adc.read_u16()
    volt = raw * 3.3 / 65535
    print(f"{raw:5}    {volt:.3f} V")
    sleep(0.5)