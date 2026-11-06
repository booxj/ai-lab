# -*- coding: utf-8 -*-
"""本地验收脚本：连接已启动的无头 Chrome（DevTools 端口 9555），
统计 JS 报错、网络字节、横向滚动，并截图 / 悬停 / 点击。

启动 Chrome：
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
    --remote-debugging-port=9555 --remote-allow-origins=* \
    --enable-unsafe-swiftshader --use-angle=swiftshader \
    --user-data-dir=/tmp/ai-lab-chrome-9555 about:blank

用法：
  python3 tools/verify.py --url <url> --shot <png> [--hover id] [--click id]
"""
import argparse
import base64
import json
import time
import urllib.parse
import urllib.request

import websocket

PORT = 9555
BASE = "http://localhost:%d" % PORT


def request(path, method="GET"):
    req = urllib.request.Request(BASE + path, method=method)
    return json.load(urllib.request.urlopen(req, timeout=5))


class Tab:
    def __init__(self, url):
        self.info = request("/json/new?" + urllib.parse.quote(url, safe=""), "PUT")
        self.ws = websocket.create_connection(self.info["webSocketDebuggerUrl"],
                                              timeout=30)
        self.msg_id = 0
        self.errors = []
        self.bytes_by_url = {}
        self._reqs = {}

    def send(self, method, params=None):
        self.msg_id += 1
        self.ws.send(json.dumps({"id": self.msg_id, "method": method,
                                 "params": params or {}}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.msg_id:
                return msg
            self._event(msg)

    def _event(self, msg):
        m = msg.get("method")
        p = msg.get("params", {})
        if m == "Runtime.exceptionThrown":
            d = p["exceptionDetails"]
            desc = (d.get("exception") or {}).get("description", "")
            self.errors.append("exception: " + d.get("text", "") + " " + desc)
        elif m == "Runtime.consoleAPICalled" and p.get("type") == "error":
            self.errors.append("console.error: " + " ".join(
                str(a.get("value", a.get("description", ""))) for a in p["args"]))
        elif m == "Log.entryAdded" and p["entry"]["level"] == "error":
            self.errors.append("log: " + p["entry"].get("text", ""))
        elif m == "Network.requestWillBeSent":
            self._reqs[p["requestId"]] = p["request"]["url"]
        elif m == "Network.loadingFinished":
            url = self._reqs.get(p["requestId"], "?")
            self.bytes_by_url[url] = self.bytes_by_url.get(url, 0) + \
                p.get("encodedDataLength", 0)

    def enable(self):
        for d in ("Page", "Runtime", "Log", "Network"):
            self.send(d + ".enable")
        # 关缓存，保证 networkBytes 是真正的首屏字节数
        self.send("Network.setCacheDisabled", {"cacheDisabled": True})

    def navigate(self, url):
        self.send("Page.navigate", {"url": url})

    def resize(self, w, h):
        self.send("Emulation.setDeviceMetricsOverride",
                  {"width": w, "height": h, "deviceScaleFactor": 1,
                   "mobile": w < 500})

    def eval(self, expr):
        r = self.send("Runtime.evaluate", {"expression": expr,
                                           "returnByValue": True,
                                           "awaitPromise": True})
        return (r.get("result", {}).get("result") or {}).get("value")

    def hover(self, x, y):
        self.send("Input.dispatchMouseEvent", {"type": "mouseMoved",
                                               "x": x, "y": y})

    def click(self, x, y):
        self.send("Input.dispatchMouseEvent",
                  {"type": "mouseMoved", "x": x, "y": y})
        self.send("Input.dispatchMouseEvent",
                  {"type": "mousePressed", "x": x, "y": y,
                   "button": "left", "clickCount": 1})
        self.send("Input.dispatchMouseEvent",
                  {"type": "mouseReleased", "x": x, "y": y,
                   "button": "left", "clickCount": 1})

    def wheel(self, x, y, dy):
        self.send("Input.dispatchMouseEvent",
                  {"type": "mouseWheel", "x": x, "y": y,
                   "deltaX": 0, "deltaY": dy})

    def shot(self, path):
        r = self.send("Page.captureScreenshot", {"format": "png"})
        with open(path, "wb") as f:
            f.write(base64.b64decode(r["result"]["data"]))

    def close(self):
        try:
            self.ws.close()
        except Exception:
            pass
        try:
            request("/json/close/" + self.info["id"])
        except Exception:
            pass


def do_wheel(tab, spec):
    x, y, dy = [float(v) for v in spec.split(",")]
    tab.hover(x, y)
    for _ in range(4):
        tab.wheel(x, y, dy)
        time.sleep(0.15)
    time.sleep(1.2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--shot")
    ap.add_argument("--wait", type=float, default=4.0)
    ap.add_argument("--width", type=int, default=1440)
    ap.add_argument("--height", type=int, default=900)
    ap.add_argument("--hover", default=None, help="节点 id")
    ap.add_argument("--click", default=None, help="节点 id")
    ap.add_argument("--shot2", default=None)
    ap.add_argument("--shot3", default=None)
    ap.add_argument("--wheel", default=None, help="x,y,dy")
    ap.add_argument("--wheel2", default=None, help="x,y,dy（另一轮）")
    ap.add_argument("--key", default=None, help="逗号分隔按键，如 ArrowRight,ArrowRight")
    ap.add_argument("--dbl", default=None, help="x,y 双击")
    ap.add_argument("--eval", default=None, help="等待后求值并写入报告")
    args = ap.parse_args()

    tab = Tab("about:blank")
    try:
        tab.enable()
        tab.resize(args.width, args.height)
        tab.navigate(args.url)
        time.sleep(args.wait)

        report = {"url": args.url}
        if args.hover or args.click:
            nid = args.hover or args.click
            coord = tab.eval(
                "window.__aiLab ? __aiLab.screenOf(%s) : null" %
                json.dumps(nid))
            if coord:
                tab.hover(coord[0], coord[1])
                time.sleep(0.7)
                if args.click:
                    tab.click(coord[0], coord[1])
                    time.sleep(1.6)
                report["coord"] = coord

        if args.wheel:
            do_wheel(tab, args.wheel)

        if args.shot:
            tab.shot(args.shot)
        if args.shot2:
            tab.shot(args.shot2)

        if args.wheel2:
            do_wheel(tab, args.wheel2)

        if args.dbl:
            x, y = [float(v) for v in args.dbl.split(",")]
            tab.hover(x, y)
            for cc in (1, 2):
                tab.send("Input.dispatchMouseEvent",
                         {"type": "mousePressed", "x": x, "y": y,
                          "button": "left", "clickCount": cc})
                tab.send("Input.dispatchMouseEvent",
                         {"type": "mouseReleased", "x": x, "y": y,
                          "button": "left", "clickCount": cc})
                time.sleep(0.09)
            time.sleep(1.4)

        if args.shot3:
            tab.shot(args.shot3)

        if args.key:
            codes = {"ArrowRight": 39, "ArrowLeft": 37, "Escape": 27,
                     "PageUp": 33, "PageDown": 34}
            for k in [v.strip() for v in args.key.split(",") if v.strip()]:
                tab.send("Input.dispatchKeyEvent",
                         {"type": "rawKeyDown", "key": k,
                          "windowsVirtualKeyCode": codes.get(k, 0)})
                tab.send("Input.dispatchKeyEvent",
                         {"type": "keyUp", "key": k,
                          "windowsVirtualKeyCode": codes.get(k, 0)})
                time.sleep(0.7)
            time.sleep(0.6)

        page = tab.eval(
            "JSON.stringify({scrollW:document.documentElement.scrollWidth,"
            "innerW:window.innerWidth,"
            "scrollH:document.documentElement.scrollHeight,"
            "href:location.href,"
            "perf:(window.__aiLabInfo ? __aiLabInfo() : null),"
            "work:(window.__aiLabWork ? __aiLabWork() : null)})")
        if args.eval:
            report["eval"] = tab.eval(args.eval)

        report["jsErrors"] = len(tab.errors)
        report["errors"] = tab.errors[:12]
        by_url = sorted(((u, b) for u, b in tab.bytes_by_url.items()
                         if not u.startswith("data:")),
                        key=lambda x: -x[1])
        report["networkBytes"] = int(sum(b for _, b in by_url))
        report["biggest"] = [[u.split("/")[-1], int(b)] for u, b in by_url[:8]]
        report["page"] = json.loads(page) if page else None
        print(json.dumps(report, ensure_ascii=False, indent=1))
    finally:
        tab.close()


if __name__ == "__main__":
    main()
