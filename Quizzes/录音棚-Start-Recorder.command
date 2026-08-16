#!/bin/bash
# 双击这个文件，就会启动本地小服务器并打开「真人录音棚」。
# Double-click to serve this folder and open the voice recorder in Chrome.
# 录完后回到这个终端窗口，按 Control + C 关掉服务器即可。

cd "$(dirname "$0")" || exit 1
PORT=8765
URL="http://localhost:$PORT/Chinese-Pinyin-Recorder-Zhi-Chuan-He-Feng-Zheng.html"

echo "================================================"
echo "  🎙️  《纸船和风筝》真人录音棚"
echo "  正在启动本地服务器： $URL"
echo "  录完后：回到这个窗口，按 Control + C 关闭。"
echo "================================================"

# 打开 Chrome（没装 Chrome 就用默认浏览器）
( sleep 1
  if open -a "Google Chrome" "$URL" 2>/dev/null; then :; else open "$URL"; fi
) &

python3 -m http.server $PORT
