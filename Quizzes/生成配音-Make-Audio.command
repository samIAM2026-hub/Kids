#!/bin/bash
# 双击这个文件，就会用 Mac 自带的中文语音生成《纸船和风筝》拼音乐园的全部配音。
# 不用录音、不用联网、不用装任何东西。生成的文件直接存进 audio/zhichuan/。
#
# 想更好听？系统设置 → 辅助功能 → 朗读内容 → 系统语音 → 管理语音…
#   下载「婷婷（增强）/ Tingting (Enhanced)」或「美嘉 / Meijia」，再跑一次这个文件。

cd "$(dirname "$0")" || exit 1
OUT="audio/zhichuan"
mkdir -p "$OUT"

# ---- 保护真人录音：文件夹里有 .webm（录音棚录的）就先问一句 ----
HUMAN=$(ls "$OUT"/*.webm 2>/dev/null | wc -l | tr -d ' ')
if [ "$HUMAN" -gt 0 ]; then
  echo "⚠️  检测到 $HUMAN 个真人录音（.webm）。"
  echo "   继续生成会覆盖掉现在游戏里正在用的 .m4a（那是从真人录音转出来的）。"
  read -p "   确定要用机器音覆盖吗？输入 yes 继续，直接回车取消： " ans
  if [ "$ans" != "yes" ]; then echo "已取消 —— 真人录音保持不变。"; read -n 1 -s -p "按任意键关闭…"; exit 0; fi
fi

# ---- 挑一个最好的中文声音（优先增强/高级版）----
VOICES=$(say -v '?' 2>/dev/null)
VOICE=""
for want in "Tingting (Premium)" "Tingting (Enhanced)" "Meijia (Premium)" "Meijia (Enhanced)" \
            "婷婷（高级）" "婷婷（增强）" "Tingting" "Meijia" "Sinji" "Li-Mu" "Yu-shu"; do
  if echo "$VOICES" | grep -q "^$want"; then VOICE="$want"; break; fi
done
if [ -z "$VOICE" ]; then
  VOICE=$(echo "$VOICES" | grep -i "zh_CN" | head -1 | sed 's/  *[a-z][a-z]_[A-Z][A-Z].*//')
fi
if [ -z "$VOICE" ]; then
  echo "❌ 没找到中文语音。请到 系统设置 → 辅助功能 → 朗读内容 → 管理语音 下载「婷婷」。"
  read -n 1 -s -p "按任意键关闭…"; exit 1
fi

echo "================================================"
echo "  🔊 用语音「$VOICE」生成配音"
echo "  存到： $(pwd)/$OUT"
echo "================================================"

say_one () {   # $1 = 文件名(id)   $2 = 要读的内容
  local id="$1" text="$2"
  say -v "$VOICE" -r 155 -o "$OUT/$id.aiff" "$text" 2>/dev/null || return 1
  afconvert -f m4af -d aac "$OUT/$id.aiff" "$OUT/$id.m4a" >/dev/null 2>&1 && rm -f "$OUT/$id.aiff"
  printf "  ✅ %-14s %s\n" "$id" "$text"
}

# ---------- 生字（带组词，声调更准）----------
say_one c-zhe        "折纸船"
say_one c-zhi        "纸。纸船。"
say_one c-zhang      "张。一张纸条。"
say_one c-tiao       "条。纸条。"
say_one c-ju         "句。一句话。"
say_one c-zha        "扎风筝"
say_one c-zhua       "抓。抓住。"
say_one c-xing       "幸。幸福。"
say_one c-fu         "福。幸福。"
say_one c-chao       "吵。吵架。"
say_one c-piao-shui  "纸船在小溪里漂。"
say_one c-piao-feng  "风筝在天上飘。"
say_one c-mei        "莓。草莓。"
say_one c-huai       "坏。乐坏了。"
say_one c-chao-huo   "炒。炒菜。"

# ---------- 词语 ----------
say_one w-songshu    "松鼠"
say_one w-xiaoxiong  "小熊"
say_one w-shanding   "山顶"
say_one w-shanjiao   "山脚"
say_one w-xiaoxi     "小溪"
say_one w-zhichuan   "纸船"
say_one w-fengzheng  "风筝"
say_one w-songguo    "松果"
say_one w-caomei     "草莓"
say_one w-zhitiao    "纸条"
say_one w-xingfu     "幸福"
say_one w-kuaile     "快乐"
say_one w-chaojia    "吵架"
say_one w-hehao      "和好"

# ---------- 课文句子 ----------
say_one s-1 "松鼠住在山顶，小熊住在山脚。"
say_one s-2 "山上的小溪往下流，从小熊的家门口流过。"
say_one s-3 "松鼠折了一只纸船，放在小溪里。"
say_one s-4 "纸船上放着一个松果，还有一张纸条。"
say_one s-5 "小熊扎了一只风筝，让它乘着风飞上山顶。"
say_one s-6 "风筝上挂着一个草莓，香香甜甜的。"
say_one s-7 "他们俩为了一点小事吵架了。"
say_one s-8 "纸船又漂来了，他们俩和好了。"

# ---------- 选字题的句子 ----------
say_one p-1 "纸船在小溪里漂哇漂，漂到小熊家门口。"
say_one p-2 "风筝乘着风飘呀飘，飞到松鼠家门口。"
say_one p-3 "松鼠抓住风筝的线，一看，乐坏了。"
say_one p-4 "小熊扎了一只漂亮的风筝。"
say_one p-5 "纸条上写着，祝你幸福！"
say_one p-6 "小熊拿起纸船一看，乐坏了。"
say_one p-7 "他们俩为了一点小事吵了一架。"
say_one p-8 "妈妈在厨房里炒菜，真香！"
say_one p-9 "纸船上还有一张纸条。"

echo ""
echo "🎉 全部完成！共 $(ls "$OUT" | grep -c '\.m4a$') 个音频。"
echo "   现在双击 Chinese-Pinyin-Game-Zhi-Chuan-He-Feng-Zheng.html 就能听到了。"
echo "   哪一条读得不好，重录/重生成都行 —— 也可以用「真人录音棚」单独替换那一条。"
echo ""
read -n 1 -s -p "按任意键关闭这个窗口…"
