"""Exercise durable pending keys and real call-site recovery after response loss."""
import contextlib
import copy
import importlib.util
import io
import json
import tempfile
import unittest
import uuid
from pathlib import Path
ROOT = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("course_publish", ROOT / "publish.py")
publish = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(publish)
UPLOAD = "bd685f53-1727-4b2a-965c-7c54a51b4edc"

class FakeAPI:
    base = "http://example.test/"
    actor = "a0000000-0000-4000-8000-000000000001"
    def __init__(self):
        self.records, self.blocks, self.ledger, self.posts = {}, {}, {}, []
        self.drop = None
        self.before_request = None
    def post(self, path, payload, key):
        if self.before_request:
            self.before_request(path, key)
        identity = (self.actor, path, key)
        if identity in self.ledger:
            old_payload, record = self.ledger[identity]
            if old_payload != payload or record["id"] not in self.records:
                raise RuntimeError("HTTP 409")
        else:
            self.posts.append((path, payload))
            record = {"id": str(uuid.uuid4()), **payload}
            if path == "/api/courses": record["status"] = "DRAFT"
            if path.endswith("/pages"): record["courseId"] = path.split("/")[3]
            if path == "/api/content/text": record["type"] = "TEXT"
            self.records[record["id"]] = record
            if path.endswith("/blocks"):
                self.blocks.setdefault(path.split("/")[3], []).append(record)
            self.ledger[identity] = (copy.deepcopy(payload), record)
        if self.drop and self.drop(path):
            self.drop = None
            raise ConnectionError("server committed but response was lost")
        return record
    def upload(self, file, key):
        return self.post("/api/content/media", {"raw": file.read_bytes()}, key)
    def get(self, path):
        if path == "/api/users/me": return {"id": self.actor}
        if path.endswith("/blocks"): return self.blocks.get(path.split("/")[3], [])
        record = self.records[path.rsplit("/", 1)[-1]]
        return record["raw"] if path.startswith("/api/content/media/") else record

class PublishTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.state = Path(self.tmp.name)/"state.json"
        self.api = FakeAPI()
        self.course = json.loads((ROOT/"brain-computer-interface.json").read_text())
        self.quiet = contextlib.redirect_stdout(io.StringIO())
        self.quiet.__enter__()
        self.addCleanup(self.quiet.__exit__, None, None, None)
    def publisher(self, **kwargs):
        return publish.Publisher(kwargs.get("api", self.api), kwargs.get("state", self.state),
                                 kwargs.get("upload", UPLOAD), kwargs.get("courses", [self.course]))
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


    def test_complete_resume_and_source_numbers(self):
        with self.publisher() as p: p.publish(self.course)
        count = len(self.api.posts)
        with self.publisher() as p: p.publish(self.course)
        self.assertEqual(len(self.api.posts), count)
        labels = [str(q["sourceNumber"]) for page in self.course["pages"] for q in page["questions"]]
        title_records = [self.api.records[item["id"]]["content"] for key, item in json.loads(self.state.read_text())["items"].items() if ":question-title:" in key and ":block:" not in key]
        self.assertEqual(sorted(title_records), sorted(labels))
        self.assertEqual(len([1 for path,_ in self.api.posts if path=="/api/questions"]), 5)
    def test_response_loss_for_all_six_creation_operations(self):
        predicates = [lambda path: path=="/api/courses", lambda path: path.endswith("/pages"),
                      lambda path: path=="/api/content/text", lambda path: path=="/api/content/media",
                      lambda path: path=="/api/questions", lambda path: path.endswith("/blocks")]
        for i,predicate in enumerate(predicates):
            with self.subTest(kind=i):
                self.api = FakeAPI(); self.api.drop = predicate
                self.state = Path(self.tmp.name)/f"state-{i}.json"
                with self.publisher() as p:
                    with self.assertRaises(ConnectionError): p.publish(self.course)
                pending = [v for v in json.loads(self.state.read_text())["items"].values() if v["status"]=="pending"]
                self.assertEqual(len(pending),1)
                with self.publisher() as p: p.publish(self.course)
                self.assertEqual(len(self.api.records),len(self.api.ledger))
                count=len(self.api.records)
                with self.publisher() as p: p.publish(self.course)
                self.assertEqual(len(self.api.records),count)
    def test_state_loss_recovers_same_resources(self):
        with self.publisher() as p: p.publish(self.course)
        identities=set(self.api.records)
        self.state.unlink()
        with self.publisher() as p: p.publish(self.course)
        self.assertEqual(set(self.api.records), identities)
    def test_pending_is_on_disk_before_any_mutation(self):
        def verify(path,key):
            items=json.loads(self.state.read_text())["items"].values()
            self.assertTrue(any(x["key"]==key and x["status"]=="pending" for x in items))
        self.api.before_request=verify
        with self.publisher() as p: p.publish(self.course)
    def test_mismatched_environment_account_upload_and_manifest_are_rejected(self):
        with self.publisher(): pass
        cases=[("base","http://different.test/"),("actor",str(uuid.uuid4()))]
        for attr,value in cases:
            old=getattr(self.api,attr); setattr(self.api,attr,value)
            with self.assertRaisesRegex(ValueError,"mismatched"): self.publisher()
            setattr(self.api,attr,old)
        with self.assertRaisesRegex(ValueError,"mismatched"): self.publisher(upload=str(uuid.uuid4()))
        changed=copy.deepcopy(self.course);changed["title"]+=" changed"
        with self.assertRaisesRegex(ValueError,"mismatched"): self.publisher(courses=[changed])
        self.assertEqual(self.api.posts,[])
    def test_legacy_state_is_rejected(self):
        self.state.write_text(json.dumps({"apiBase":self.api.base,"items":{}}))
        with self.assertRaisesRegex(ValueError,"Legacy"): self.publisher()
        self.assertEqual(self.api.posts,[])
    def test_same_state_cannot_be_opened_concurrently(self):
        with self.publisher():
            with self.assertRaises(BlockingIOError): self.publisher()
        with self.publisher(): pass
    def test_published_course_stops_before_child_changes(self):
        with self.publisher() as p: course_id=p.publish(self.course)
        self.api.records[course_id]["status"]="PUBLISHED"
        count=len(self.api.posts)
        with self.publisher() as p:
            with self.assertRaisesRegex(ValueError,"differs"): p.publish(self.course)
        self.assertEqual(len(self.api.posts),count)
    def test_missing_or_changed_resource_is_not_replaced(self):
        with self.publisher() as p: p.publish(self.course)
        item=next(v for k,v in json.loads(self.state.read_text())["items"].items() if k.endswith(":description") and ":block:" not in k)
        self.api.records[item["id"]]["content"]="tampered"
        count=len(self.api.posts)
        with self.publisher() as p:
            with self.assertRaisesRegex(ValueError,"differs"): p.publish(self.course)
        self.assertEqual(len(self.api.posts),count)
    def test_http_failures_stop_with_pending_keys_and_renewed_session_can_resume(self):
        for code in (400, 401, 403, 409):
            with self.subTest(code=code):
                self.api=FakeAPI()
                self.state=Path(self.tmp.name)/f"http-{code}.json"
                def fail(path,key): raise RuntimeError(f"HTTP {code}")
                self.api.before_request=fail
                with self.publisher() as p:
                    with self.assertRaisesRegex(RuntimeError,f"HTTP {code}"): p.publish(self.course)
                items=json.loads(self.state.read_text())["items"]
                self.assertEqual(len(items),1)
                self.assertEqual(next(iter(items.values()))["status"],"pending")
                self.assertEqual(self.api.posts,[])
                if code==401:
                    pending_key=next(iter(items.values()))["key"]
                    self.api.before_request=None
                    with self.publisher() as p: p.publish(self.course)
                    self.assertEqual(next(iter(json.loads(self.state.read_text())["items"].values()))["key"],pending_key)

    def test_rejects_unsafe_origin_and_zero_upload_id(self):
        for base in ["https://user:pass@example.test", "https://example.test/api", "https://example.test/?secret=x"]:
            with self.assertRaises(ValueError): publish.normalize_base(base)
        with self.assertRaises(ValueError): self.publisher(upload=str(uuid.UUID(int=0)))

if __name__ == "__main__": unittest.main()
