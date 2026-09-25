"""Builds the reel's voiceover from voiceover.json.

    python promo/voiceover.py path/to/kokoro-v1.0.onnx path/to/voices-v1.0.bin

Uses Kokoro (pip install kokoro-onnx soundfile numpy), an open text to speech
model that runs locally. The model files are on the kokoro-onnx GitHub
releases page. Each line is spoken and placed at its "at" time, then the
track is written to promo/voiceover.wav for render.mjs to mix in.
"""
import json, sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

here = Path(__file__).parent
cfg = json.loads((here / "voiceover.json").read_text())
k = Kokoro(sys.argv[1], sys.argv[2])

sr = 24000
track = np.zeros(int(cfg["duration"] * sr), dtype=np.float32)
for line in cfg["lines"]:
    audio, sr = k.create(line["text"], voice=cfg["voice"], speed=cfg["speed"], lang=cfg["lang"])
    start = int(line["at"] * sr)
    end = min(len(track), start + len(audio))
    track[start:end] += audio[: end - start]
    print(f'{line["at"]:6.2f}s  {len(audio) / sr:4.2f}s  {line["text"]}')
    if start + len(audio) > len(track):
        print("  runs past the end of the reel", file=sys.stderr)

sf.write(here / "voiceover.wav", track, sr)
print(f"Wrote {here / 'voiceover.wav'}")
