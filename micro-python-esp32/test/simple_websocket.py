# simple_websocket.py
import usocket as socket
import ubinascii
import urandom

class WebSocketClient:
    def __init__(self, uri):
        self.uri = uri
        self.sock = None

    def connect(self):
        proto, dummy, host, path = self.uri.split("/", 3)
        port = 80
        if ":" in host:
            host, port = host.split(":")
            port = int(port)
        
        addr = socket.getaddrinfo(host, port)[0][-1]
        self.sock = socket.socket()
        self.sock.connect(addr)
        
        key = ubinascii.b2a_base64(bytes(urandom.getrandbits(8) for _ in range(16)))[:-1]
        
        req = "GET /{} HTTP/1.1\r\n".format(path)
        req += "Host: {}:{}\r\n".format(host, port)
        req += "Connection: Upgrade\r\n"
        req += "Upgrade: websocket\r\n"
        req += "Sec-WebSocket-Key: {}\r\n".format(key.decode())
        req += "Sec-WebSocket-Version: 13\r\n\r\n"
        
        self.sock.send(req.encode())
        resp = self.sock.recv(4096)
        if b" 101 " not in resp:
            raise ValueError("Handshake failed")

    def send(self, data):
        if not self.sock: return
        frame = bytearray()
        frame.append(0x81) # Text frame
        length = len(data)
        if length < 126:
            frame.append(length | 0x80)
        elif length < 65536:
            frame.append(126 | 0x80)
            frame.extend(length.to_bytes(2, "big"))
        else:
            frame.append(127 | 0x80)
            frame.extend(length.to_bytes(8, "big"))
        
        mask = [urandom.getrandbits(8) for _ in range(4)]
        frame.extend(mask)
        
        data_bytes = data.encode()
        masked_data = bytearray(len(data_bytes))
        for i in range(len(data_bytes)):
            masked_data[i] = data_bytes[i] ^ mask[i % 4]
        frame.extend(masked_data)
        
        self.sock.send(frame)

    def recv(self):
        if not self.sock: return None
        try:
            head = self.sock.recv(2)
            if not head: return None
            length = head[1] & 0x7F
            if length == 126:
                length = int.from_bytes(self.sock.recv(2), "big")
            elif length == 127:
                length = int.from_bytes(self.sock.recv(8), "big")
            
            # Skip mask if server doesn't mask (fastapi doesn't mask downstream)
            payload = self.sock.recv(length)
            return payload.decode()
        except Exception as sock_err:
            print(f"[WS] Socket receive error: {sock_err}")
            return None

    def close(self):
        if self.sock:
            self.sock.close()