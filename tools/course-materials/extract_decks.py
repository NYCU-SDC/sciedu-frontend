"""Extract the approved course material from the two supplied PowerPoint decks.

Usage: python3 tools/course-materials/extract_decks.py WOLF.pptx BCI.pptx

The PPTX files are inputs only. This script preserves embedded picture bytes and
editable slide text; it does not render the slide chrome into the lesson image.
"""

from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parent
NAMESPACES = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
}

DECKS = (
    {
        "code": "dire-wolf-revival",
        "title": "恐狼復育",
        "group": "題組二",
        "prefix": "2",
        "image_sources": (
            ("image1.png",),
            ("image3.png", "image4.png"),
            ("image8.png", "image7.png"),
            ("image12.png",),
        ),
    },
    {
        "code": "brain-computer-interface",
        "title": "腦機介面",
        "group": "題組一",
        "prefix": "1",
        "image_sources": (
            ("image2.png", "image1.jpg"),
            ("image8.png", "image9.png", "image6.png"),
            ("image13.png", "image14.png"),
            ("image18.png", "image17.png"),
        ),
    },
)


def slide_texts(archive: zipfile.ZipFile, number: int) -> list[str]:
    slide = ElementTree.fromstring(archive.read(f"ppt/slides/slide{number}.xml"))
    texts = []
    for shape in slide.findall(".//p:spTree/p:sp", NAMESPACES):
        text = "".join(node.text or "" for node in shape.findall(".//a:t", NAMESPACES))
        if text.strip():
            texts.append(text.strip())
    return texts


def normalize(text: str) -> str:
    # The supplied decks contain a few doubled full stops in editable text.
    return text.replace("。。", "。")


def extract(path: Path, config: dict) -> dict:
    pages = []
    asset_dir = ROOT / "assets" / config["code"]
    asset_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(path) as archive:
        for index, image_sources in enumerate(config["image_sources"], start=1):
            content_slide = 3 * index - 2
            description_slide = content_slide + 2
            texts = slide_texts(archive, content_slide)
            body = max((t for t in texts if not re.match(r"^\d+\.\s*", t)), key=len)
            question_text = "".join(t for t in texts if re.match(r"^\d+\.\s*", t))
            prompts = [
                match.group(1).strip()
                for match in re.finditer(
                    r"\d+\.\s*(.*?)(?=\d+\.\s*|$)", question_text, re.DOTALL
                )
            ]
            if not prompts:
                raise ValueError(f"Missing questions on slide {content_slide} of {path}")
            visual_description = normalize(
                "".join(slide_texts(archive, description_slide))
            )
            images = []
            for image_index, source in enumerate(image_sources, start=1):
                suffix = Path(source).suffix.lower()
                filename = f"{config['prefix']}-{index}-image-{image_index}{suffix}"
                (asset_dir / filename).write_bytes(archive.read(f"ppt/media/{source}"))
                images.append(
                    {
                        "file": f"assets/{config['code']}/{filename}",
                        "sourceMedia": source,
                    }
                )

            pages.append(
                {
                    "code": f"{config['prefix']}-{index}",
                    "title": f"{config['group']} {config['title']} {config['prefix']}-{index}",
                    "sourceSlides": [content_slide, content_slide + 1, description_slide],
                    "description": normalize(body),
                    "images": images,
                    "questions": [{"type": "TEXT", "prompt": normalize(p)} for p in prompts],
                    "imageDescriptionForLLM": visual_description,
                }
            )

    return {
        "code": config["code"],
        "title": config["title"],
        "sourceDeck": path.name,
        "pages": pages,
    }


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    for input_path, config in zip(map(Path, sys.argv[1:]), DECKS, strict=True):
        course = extract(input_path, config)
        output = ROOT / f"{config['code']}.json"
        output.write_text(json.dumps(course, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{output}: {len(course['pages'])} pages")


if __name__ == "__main__":
    main()
