"""Contract tests for the PageBlock layout and resumable uploader."""

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("course_publish", ROOT / "publish.py")
publish = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(publish)


class FakeAPI:
    base = "http://example.test/"

    def __init__(self):
        self.records = {}
        self.blocks = {}
        self.posts = []

    def post(self, path, payload):
        self.posts.append((path, payload))
        record = {"id": f"id-{len(self.posts)}", **payload}
        self.records[record["id"]] = record
        if path.endswith("/blocks"):
            page_id = path.split("/")[3]
            self.blocks.setdefault(page_id, []).append(record)
        return record

    def upload(self, path):
        return self.post("/api/content/media", {"file": str(path)})

    def get(self, path):
        if path.endswith("/blocks"):
            page_id = path.split("/")[3]
            return self.blocks.get(page_id, [])
        return self.records[path.rsplit("/", 1)[-1]]


class PublishTests(unittest.TestCase):
    def test_layout_contract(self):
        bci = json.loads((ROOT / "brain-computer-interface.json").read_text())
        layout = publish.plan(bci)
        self.assertEqual([p["displayOrder"] for p in layout], [0, 1, 2, 3])
        self.assertEqual(
            [(b["type"], b["order"]) for b in layout[1]["blocks"]],
            [("TEXT", 0), ("MEDIA", 10), ("MEDIA", 20), ("MEDIA", 30),
             ("TEXT", 100), ("QUESTION", 101), ("TEXT", 110), ("QUESTION", 111),
             ("TEXT", 200)],
        )
        self.assertFalse(layout[1]["blocks"][-1]["required"])

    def test_publish_creates_draft_and_resumes_without_new_posts(self):
        course = json.loads((ROOT / "brain-computer-interface.json").read_text())
        api = FakeAPI()
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory) / "state.json"
            publish.Publisher(api, state).publish(course)
            first_count = len(api.posts)
            self.assertEqual(api.posts[0], ("/api/courses", {"code": course["code"], "title": course["title"]}))
            self.assertEqual(sum(1 for path, _ in api.posts if path == "/api/questions"), 5)
            visual_blocks = [payload for path, payload in api.posts if path.endswith("/blocks") and payload["displayOrder"] == 200]
            self.assertEqual(len(visual_blocks), 4)
            self.assertTrue(all(not block["required"] and block["type"] == "TEXT" for block in visual_blocks))
            publish.Publisher(api, state).publish(course)
            self.assertEqual(len(api.posts), first_count)


if __name__ == "__main__":
    unittest.main()
