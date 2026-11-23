"""Build README GIFs from recorded Obsidian PNG frames. Requires Pillow."""
from __future__ import annotations

import argparse
import bisect
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    )
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default(size=size)


def render_frame(path: Path, width: int, caption: str) -> Image.Image:
    with Image.open(path) as original:
        image = original.convert("RGB")
    height = round(image.height * width / image.width)
    image = image.resize((width, height), Image.Resampling.LANCZOS)
    frame = Image.new("RGB", (width, height + 48), "#ffffff")
    frame.paste(image)
    draw = ImageDraw.Draw(frame)
    draw.line((0, height, width, height), fill="#e5e7eb")
    draw.rounded_rectangle((18, height + 16, 24, height + 31), radius=3, fill="#7180c2")
    draw.text((36, height + 14), caption, fill="#313640", font=font(18))
    return frame


def build_clip(directory: Path, destination: Path, width: int, fps: int) -> dict:
    clip = json.loads((directory / "frames.json").read_text())
    entries = sorted(clip["frames"], key=lambda frame: frame["time"])
    times = [frame["time"] for frame in entries]
    captions = sorted(clip["captions"], key=lambda entry: entry["time"])
    caption_times = [entry["time"] for entry in captions]
    seconds = clip["end"] - clip["start"]
    if not clip.get("complete") or len(entries) < 2 or not captions or not 0 < seconds < 90:
        raise ValueError(f"Incomplete recording: {directory}")
    count = math.ceil(seconds * fps)
    # A shared palette keeps UI text and branch colors stable across frames.
    sample_indices = sorted({round(i * (len(entries) - 1) / 19) for i in range(20)})
    atlas = Image.new("RGB", (600, 100 * math.ceil(len(sample_indices) / 5)), "white")
    for position, index in enumerate(sample_indices):
        with Image.open(directory / entries[index]["file"]) as image:
            thumb = image.convert("RGB").resize((120, 100), Image.Resampling.LANCZOS)
            atlas.paste(thumb, (position % 5 * 120, position // 5 * 100))
    sampled = atlas.quantize(colors=190)
    # Reserve neutral ink shades: thumbnail sampling can wash out thin dark text.
    palette = Image.new("P", (1, 1))
    grays = [channel for index in range(64) for channel in [round(index * 255 / 63)] * 3]
    palette.putpalette(grays + [113, 128, 194, 49, 54, 64] + sampled.getpalette()[:190 * 3])
    frames: list[Image.Image] = []
    for index in range(count):
        timestamp = clip["start"] + index / fps
        selected = max(0, bisect.bisect_right(times, timestamp) - 1)
        caption_index = max(0, bisect.bisect_right(caption_times, timestamp) - 1)
        frame = render_frame(directory / entries[selected]["file"], width, captions[caption_index]["text"])
        frames.append(frame.quantize(palette=palette, dither=Image.Dither.NONE))
    output = destination / f"{clip['name']}.gif"
    boundaries = [round(min(index / fps, seconds) * 100) * 10 for index in range(count + 1)]
    durations = [max(10, boundaries[index + 1] - boundaries[index]) for index in range(count)]
    frames[0].save(output, save_all=True, append_images=frames[1:], duration=durations,
                   loop=0, optimize=True, disposal=1)
    with Image.open(output) as result:
        actual_duration = 0
        for index in range(result.n_frames):
            result.seek(index)
            actual_duration += result.info.get("duration", 0)
        metadata = {"file": output.name, "width": result.width, "height": result.height,
                    "frames": result.n_frames, "seconds": actual_duration / 1000,
                    "recordedSeconds": round(seconds, 2), "sampleFps": fps,
                    "bytes": output.stat().st_size, "sha256": hashlib.sha256(output.read_bytes()).hexdigest()}
    if metadata["frames"] < 2:
        raise ValueError(f"Not an animated GIF: {output}")
    print(json.dumps(metadata))
    return metadata


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("recordings", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--width", type=int, default=1040)
    parser.add_argument("--fps", type=int, default=7)
    arguments = parser.parse_args()
    if arguments.width < 400 or not 1 <= arguments.fps <= 30:
        parser.error("width must be >=400 and fps must be 1–30")
    arguments.destination.mkdir(parents=True, exist_ok=True)
    clips = [arguments.recordings] if (arguments.recordings / "frames.json").is_file() else sorted(
        path.parent for path in arguments.recordings.glob("*/frames.json"))
    if not clips:
        parser.error("No completed recordings found")
    results = [build_clip(clip, arguments.destination, arguments.width, arguments.fps) for clip in clips]
    provenance = arguments.recordings / "recordings.json"
    if not provenance.exists() and (arguments.recordings / "frames.json").is_file():
        provenance = arguments.recordings.parent / "recordings.json"
    commit = json.loads(provenance.read_text()).get("gitCommit") if provenance.exists() else None
    (arguments.destination / "manifest.json").write_text(json.dumps({"capture": "Real Obsidian UI, recorded through CDP",
        "encoding": "Python/Pillow, shared palette and frame optimization", "gitCommit": commit, "assets": results}, indent=2) + "\n")


if __name__ == "__main__":
    main()
