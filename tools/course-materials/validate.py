"""Check manifest structure and referenced source image assets."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
EXPECTED = {"brain-computer-interface": (4, 5, 9), "dire-wolf-revival": (4, 4, 6)}


def main() -> None:
    for code, (page_count, question_count, image_count) in EXPECTED.items():
        course = json.loads((ROOT / f"{code}.json").read_text(encoding="utf-8"))
        assert course["code"] == code
        assert len(course["pages"]) == page_count
        assert sum(len(p["questions"]) for p in course["pages"]) == question_count
        assert sum(len(p["images"]) for p in course["pages"]) == image_count
        for index, page in enumerate(course["pages"], start=1):
            assert page["sourceSlides"] == [3 * index - 2, 3 * index - 1, 3 * index]
            assert page["description"].strip()
            assert page["imageDescriptionForLLM"].strip()
            for image in page["images"]:
                image_path = ROOT / image["file"]
                assert image_path.is_file() and image_path.stat().st_size > 0
            for question in page["questions"]:
                assert question["type"] == "TEXT" and question["prompt"].strip()
        print(f"{code}: {page_count} pages, {question_count} questions, {image_count} images OK")


if __name__ == "__main__":
    main()
