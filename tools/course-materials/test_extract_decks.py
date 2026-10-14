"""Regression tests run without the original decks or third-party packages."""

import copy
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch
from xml.etree import ElementTree as ET

import extract_decks
import validate


def slide(texts):
    ns = extract_decks.NAMESPACES
    root = ET.Element(f"{{{ns['p']}}}sld")
    tree = ET.SubElement(root, f"{{{ns['p']}}}spTree")
    for text in texts:
        shape = ET.SubElement(tree, f"{{{ns['p']}}}sp")
        ET.SubElement(shape, f"{{{ns['a']}}}t").text = text
    return ET.tostring(root)


class ExtractionTests(unittest.TestCase):
    def extract(self, questions):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            deck = root / "source.pptx"
            with zipfile.ZipFile(deck, "w") as archive:
                for index, text in enumerate(questions):
                    number = 3 * index + 1
                    archive.writestr(
                        f"ppt/slides/slide{number}.xml",
                        slide(["教材正文保留原始文字。。" * 10, text]),
                    )
                    archive.writestr(
                        f"ppt/slides/slide{number + 2}.xml", slide(["圖片描述。。"])
                    )
                archive.writestr("ppt/media/image.png", b"original embedded bytes")
            config = {
                "code": "sample",
                "title": "教材",
                "group": "題組",
                "prefix": "1",
                "image_sources": [("image.png",)] * len(questions),
            }
            with patch.object(extract_decks, "ROOT", root):
                course = extract_decks.extract(deck, config)
            for page in course["pages"]:
                self.assertEqual(
                    (root / page["images"][0]["file"]).read_bytes(),
                    b"original embedded bytes",
                )
            return course

    def test_preserves_source_number_instead_of_page_index(self):
        course = self.extract(["7. 原始第七題。。"])
        self.assertEqual(
            course["pages"][0]["questions"],
            [{"type": "TEXT", "sourceNumber": 7, "prompt": "原始第七題。"}],
        )

    def test_preserves_multiple_questions_on_one_page(self):
        course = self.extract(["2. 第一個題目。3. 第二個題目。"])
        self.assertEqual(
            course["pages"][0]["questions"],
            [
                {"type": "TEXT", "sourceNumber": 2, "prompt": "第一個題目。"},
                {"type": "TEXT", "sourceNumber": 3, "prompt": "第二個題目。"},
            ],
        )

    def test_preserves_duplicate_source_numbers_on_distinct_pages(self):
        course = self.extract(["3. 第一頁題目", "3. 第二頁題目"])
        self.assertEqual(
            [q["sourceNumber"] for p in course["pages"] for q in p["questions"]],
            [3, 3],
        )
        self.assertEqual([p["code"] for p in course["pages"]], ["1-1", "1-2"])

    def test_missing_number_raises_explicit_error(self):
        with self.assertRaisesRegex(ValueError, "numbered questions"):
            self.extract(["沒有原始題號的題目"])

    def test_zero_number_raises_explicit_error(self):
        with self.assertRaisesRegex(ValueError, "sourceNumber"):
            self.extract(["0. 不合法題號"])

    def test_empty_prompt_raises_explicit_error(self):
        with self.assertRaisesRegex(ValueError, "Empty question"):
            self.extract(["2."])


class ManifestTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(__file__).resolve().parent
        self.course = json.loads((self.root / "brain-computer-interface.json").read_text())
        for question, number in zip(
            [q for p in self.course["pages"] for q in p["questions"]],
            [1, 2, 3, 3, 4],
        ):
            question["sourceNumber"] = number

    def test_original_duplicate_number_is_valid(self):
        validate.validate_course(self.course, self.root)

    def test_missing_source_number_is_rejected(self):
        del self.course["pages"][0]["questions"][0]["sourceNumber"]
        with self.assertRaisesRegex(ValueError, "sourceNumber"):
            validate.validate_course(self.course, self.root)

    def test_source_number_requires_positive_integer(self):
        for value in [True, "1", 1.0, 0, -1, None]:
            with self.subTest(value=value):
                course = copy.deepcopy(self.course)
                course["pages"][0]["questions"][0]["sourceNumber"] = value
                with self.assertRaisesRegex(ValueError, "sourceNumber"):
                    validate.validate_course(course, self.root)

    def test_per_page_renumbering_is_rejected(self):
        for page in self.course["pages"]:
            for index, question in enumerate(page["questions"], start=1):
                question["sourceNumber"] = index
        with self.assertRaisesRegex(ValueError, "sourceNumber sequence"):
            validate.validate_course(self.course, self.root)


if __name__ == "__main__":
    unittest.main()
