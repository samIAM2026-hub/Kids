《纸船和风筝》拼音乐园 —— 配音文件
Audio for the Zhi Chuan He Feng Zheng pinyin game.

现在这里有两套，都是同一批真人录音：
  *.webm   录音棚录下来的原始档（Chrome 录的 Opus 格式）—— 保留作备份，别删
  *.m4a    从 webm 转出来的播放档：去掉首尾静音、音量统一到 -1.5 dB 峰值
           Safari / iPad / iPhone 都能放（webm 在 Safari 上可能放不了）

游戏按 m4a → webm → mp3 → wav → ogg → aiff 的顺序找文件，所以放的是 m4a 那一套。
想换回某个词的原始录音，把对应的 .m4a 删掉就行，会自动退回 .webm。

文件名规则 / File naming
  文件名必须等于游戏里的 id，例如：
    c-zhi        纸
    c-piao-shui  漂（水）      c-piao-feng  飘（风）
    w-fengzheng  风筝
    s-3          松鼠折了一只纸船，放在小溪里。
    p-8          妈妈在厨房里炒菜，真香！

要重录某一条：打开 ../../Chinese-Pinyin-Recorder-Zhi-Chuan-He-Feng-Zheng.html
录完会写成新的 .webm，记得让 Claude 再转一次 m4a（或者直接删掉同名 .m4a）。

⚠️ 不要再双击「生成配音-Make-Audio.command」—— 那是机器音，会覆盖这批真人录音。
   （脚本现在会先问一句，输 yes 才会覆盖。）
