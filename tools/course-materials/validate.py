"""Check manifest structure and referenced source image assets."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
EXPECTED = {"brain-computer-interface": (4, 5, 9), "dire-wolf-revival": (4, 4, 6)}
EXPECTED_NUMBERS = {
    "brain-computer-interface": [1, 2, 3, 3, 4],
    "dire-wolf-revival": [1, 2, 3, 4],
}


def validate_course(course: dict, root: Path = ROOT) -> None:
    code = course["code"]
    page_count, question_count, image_count = EXPECTED[code]
    assert len(course["pages"]) == page_count
    assert sum(len(p["questions"]) for p in course["pages"]) == question_count
    assert sum(len(p["images"]) for p in course["pages"]) == image_count
    source_numbers = []
    for index, page in enumerate(course["pages"], start=1):
        assert page["sourceSlides"] == [3 * index - 2, 3 * index - 1, 3 * index]
        assert page["description"].strip()
        assert page["imageDescriptionForLLM"].strip()
        for image in page["images"]:
            image_path = root / image["file"]
            assert image_path.is_file() and image_path.stat().st_size > 0
        for question in page["questions"]:
            assert question["type"] == "TEXT" and question["prompt"].strip()
            number = question.get("sourceNumber")
            if type(number) is not int or number <= 0:
                raise ValueError(f"{code}/{page['code']}: sourceNumber must be a positive integer")
            source_numbers.append(number)
    if source_numbers != EXPECTED_NUMBERS[code]:
        raise ValueError(f"{code}: sourceNumber sequence {source_numbers} differs from the source deck")


def main() -> None:
    for code, (page_count, question_count, image_count) in EXPECTED.items():
        course = json.loads((ROOT / f"{code}.json").read_text(encoding="utf-8"))
        assert course["code"] == code
        validate_course(course)
        print(f"{code}: {page_count} pages, {question_count} questions, {image_count} images OK")


if __name__ == "__main__":
    main()
