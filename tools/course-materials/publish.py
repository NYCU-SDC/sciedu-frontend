"""Preview or safely upload official DRAFT materials (requires creation-key backend support)."""
from __future__ import annotations
import argparse
import fcntl
import getpass
import hashlib
import json
import mimetypes
import os
import uuid
import urllib.error
import urllib.request
from http.cookies import SimpleCookie
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
STATE_PATH = ROOT / ".data" / "upload-state.json"
MANIFESTS = ("brain-computer-interface.json", "dire-wolf-revival.json")
STATE_VERSION = 2

def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()

def json_bytes(value: object) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")

def normalize_base(value: str) -> str:
    parsed = urlsplit(value)
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path.strip("/"):
        raise ValueError("API base must be an HTTP(S) origin without path or credentials")
    return value.rstrip("/") + "/"

def plan(course: dict) -> list[dict]:
    """Return the PageBlock contract used by the Course Player and future LLM."""
    result = []
    for page_index, page in enumerate(course["pages"]):
        blocks = [{"key": "description", "type": "TEXT", "order": 0, "required": True}]
        blocks += [
            {"key": f"image:{i}", "type": "MEDIA", "order": 10 + 10 * i, "required": True}
            for i, _ in enumerate(page["images"])
        ]
        for i, _ in enumerate(page["questions"]):
            blocks.extend(
                [
                    {"key": f"question-title:{i}", "type": "TEXT", "order": 100 + 10 * i, "required": True},
                    {"key": f"question:{i}", "type": "QUESTION", "order": 101 + 10 * i, "required": True},
                ]
            )
        blocks.append({"key": "image-description-for-llm", "type": "TEXT", "order": 200, "required": False})
        result.append({"page": page["code"], "displayOrder": page_index, "blocks": blocks})
    return result


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RuntimeError("API redirects are refused; verify the backend origin")

class API:
    def __init__(self, base: str, cookie: str):
        self.base = normalize_base(base)
        self.cookies = SimpleCookie(cookie)
        self.opener = urllib.request.build_opener(NoRedirect())

    def request(self, method: str, path: str, body: bytes | None = None, content_type: str | None = None, key: str | None = None):
        headers = {"Cookie": "; ".join(f"{name}={value.value}" for name, value in self.cookies.items()), "Accept": "application/json"}
        if content_type:
            headers["Content-Type"] = content_type
        if key:
            headers["Idempotency-Key"] = key
        req = urllib.request.Request(self.base + path.lstrip("/"), data=body, headers=headers, method=method)
        try:
            with self.opener.open(req, timeout=45) as response:
                for value in response.headers.get_all("Set-Cookie", []):
                    self.cookies.load(value)
                if key and response.headers.get("Idempotency-Key") != key:
                    raise RuntimeError("Backend did not acknowledge Idempotency-Key; verify the required backend version before resuming")
                data = response.read()
                if "application/json" in response.headers.get("Content-Type", ""):
                    return json.loads(data) if data else None
                return data
        except urllib.error.HTTPError as error:
            detail = error.read(800).decode("utf-8", errors="replace")
            raise RuntimeError(f"{method} {path}: HTTP {error.code}: {detail}. Stop and review; resume with the same upload ID.") from error

    def get(self, path: str):
        return self.request("GET", path)

    def post(self, path: str, value: dict, key: str):
        return self.request("POST", path, json_bytes(value), "application/json", key)

    def upload(self, file: Path, key: str):
        boundary = "sciedu-course-material-upload"
        content_type = mimetypes.guess_type(file.name)[0] or "application/octet-stream"
        body = (
            f'--{boundary}\r\nContent-Disposition: form-data; name="content"; filename="{file.name}"\r\n'
            f"Content-Type: {content_type}\r\n\r\n"
        ).encode() + file.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
        return self.request("POST", "/api/content/media", body, f"multipart/form-data; boundary={boundary}", key)


class Publisher:
    """One locked state file per upload; each mutation has a durable pending key."""
    def __init__(self, api: API, state_path: Path, upload_id: str, courses: list[dict]):
        self.api = api
        self.state_path = Path(state_path)
        self.upload_id = uuid.UUID(str(upload_id))
        if self.upload_id.int == 0:
            raise ValueError("upload ID must be a nonzero UUID")
        # Include source bytes so an image change cannot reuse a saved batch.
        self.courses = courses
        fingerprint = digest(json_bytes(courses) + b"".join(
            (ROOT / image["file"]).read_bytes()
            for course in courses for page in course["pages"] for image in page["images"]
        ))
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        self.lock = self.state_path.with_suffix(self.state_path.suffix + ".lock").open("a")
        try:
            fcntl.flock(self.lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            actor = api.get("/api/users/me")["id"]
            uuid.UUID(actor)
            self.binding = {"version": STATE_VERSION, "apiBase": normalize_base(api.base), "actorId": actor,
                            "uploadId": str(self.upload_id), "manifestSHA256": fingerprint}
            self.state = json.loads(self.state_path.read_text()) if self.state_path.exists() else {**self.binding, "items": {}}
            if any(self.state.get(k) != v for k, v in self.binding.items()):
                raise ValueError("Legacy or mismatched checkpoint: verify API origin, user, upload ID and materials; no resources changed")
            self.save()
        except BaseException:
            self.close()
            raise

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    def close(self):
        self.lock.close()

    def save(self):
        temporary = self.state_path.with_suffix(self.state_path.suffix + ".tmp")
        with temporary.open("w") as file:
            json.dump(self.state, file, ensure_ascii=False, indent=2, sort_keys=True)
            file.write("\n")
            file.flush()
            os.fsync(file.fileno())
        os.replace(temporary, self.state_path)
        directory = os.open(str(self.state_path.parent), os.O_RDONLY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)

    def ensure(self, identity: str, path: str, payload: dict | Path, get_path: str, verify):
        key = str(uuid.uuid5(self.upload_id, identity))
        fingerprint = digest(payload.read_bytes()) if isinstance(payload, Path) else digest(json_bytes(payload))
        item = self.state["items"].get(identity)
        if item and (item.get("key") != key or item.get("sha256") != fingerprint):
            raise ValueError(f"{identity}: operation differs from checkpoint")
        if not item:
            item = {"key": key, "sha256": fingerprint, "status": "pending"}
            self.state["items"][identity] = item
            self.save()  # durable before a possibly successful request
        if item.get("status") == "complete":
            identifier = item["id"]
        else:
            if getattr(self, "active_course", None) and self.api.get("/api/courses/" + self.active_course)["status"] != "DRAFT":
                raise ValueError("Course is no longer DRAFT; stop before creating resources")
            record = self.api.upload(payload, key) if isinstance(payload, Path) else self.api.post(path, payload, key)
            identifier = str(uuid.UUID(record["id"]))
        item["id"] = identifier
        actual = self.api.get(get_path.format(id=identifier))
        if not verify(actual):
            raise ValueError(f"{identity}: backend resource differs; no replacement created")
        if item.get("status") != "complete":
            item.update(id=identifier, status="complete")
            self.save()
            print(f"confirmed {identity}: {identifier}")
        return identifier

    def text(self, key: str, value: str):
        return self.ensure(key, "/api/content/text", {"content": value}, "/api/content/text/{id}",
                           lambda record: record["type"] == "TEXT" and record["content"] == value.strip())

    def media(self, key: str, file: Path):
        return self.ensure(key, "/api/content/media", file, "/api/content/media/{id}",
                           lambda raw: raw == file.read_bytes())

    def question(self, key: str, question: dict):
        payload = {"type": question["type"], "content": question["prompt"]}
        return self.ensure(key, "/api/questions", payload, "/api/questions/{id}",
                           lambda record: all(record.get(k) == v for k, v in payload.items()))

    def block(self, key: str, page_id: str, kind: str, resource_id: str, order: int, required: bool):
        payload = {"type": kind, "resourceId": resource_id, "displayOrder": order, "required": required}
        return self.ensure(key, f"/api/pages/{page_id}/blocks", payload, f"/api/pages/{page_id}/blocks",
                           lambda records: any(all(record.get(k) == v for k, v in payload.items())
                                               and record["id"] == self.state["items"][key].get("id", record["id"]) for record in records))

    def publish(self, course: dict):
        if course not in self.courses:
            raise ValueError("Course is not in the bound upload batch")
        self.active_course = None
        code = course["code"]
        payload = {"code": code, "title": course["title"]}
        course_id = self.ensure(f"{code}:course", "/api/courses", payload, "/api/courses/{id}",
                                lambda record: all(record.get(k) == v for k, v in payload.items()) and record["status"] == "DRAFT")
        self.active_course = course_id
        for page_index, page in enumerate(course["pages"]):
            key = f"{code}:{page['code']}"
            payload = {"title": page["title"], "displayOrder": page_index}
            page_id = self.ensure(f"{key}:page", f"/api/courses/{course_id}/pages", payload, "/api/pages/{id}",
                                  lambda record: record["courseId"] == course_id and all(record.get(k) == v for k, v in payload.items()))
            text_id = self.text(f"{key}:description", page["description"])
            self.block(f"{key}:block:description", page_id, "TEXT", text_id, 0, True)
            for i, image in enumerate(page["images"]):
                image_id = self.media(f"{key}:image:{i}", ROOT / image["file"])
                self.block(f"{key}:block:image:{i}", page_id, "MEDIA", image_id, 10 + 10 * i, True)
            for i, question in enumerate(page["questions"]):
                title_id = self.text(f"{key}:question-title:{i}", str(question["sourceNumber"]))
                self.block(f"{key}:block:question-title:{i}", page_id, "TEXT", title_id, 100 + 10 * i, True)
                question_id = self.question(f"{key}:question:{i}", question)
                self.block(f"{key}:block:question:{i}", page_id, "QUESTION", question_id, 101 + 10 * i, True)
            visual_id = self.text(f"{key}:image-description-for-llm", page["imageDescriptionForLLM"])
            self.block(f"{key}:block:image-description-for-llm", page_id, "TEXT", visual_id, 200, False)
        print(f"DRAFT course {code}: {course_id}")
        return course_id


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-base", help="Backend origin")
    parser.add_argument("--publish", action="store_true", help="Create DRAFT resources; default is network-free preview")
    parser.add_argument("--upload-id", help="Stable UUID; reuse it on every resume, even after losing state")
    parser.add_argument("--state", type=Path, default=STATE_PATH)
    args = parser.parse_args()
    courses = [json.loads((ROOT / name).read_text()) for name in MANIFESTS]
    from validate import validate_course
    for course in courses:
        validate_course(course)
    if not args.publish:
        for course in courses:
            print(json.dumps({"course": course["code"], "pages": plan(course)}, ensure_ascii=False, indent=2))
        return
    if not args.api_base or not args.upload_id:
        parser.error("--publish requires --api-base and --upload-id UUID")
    try:
        normalize_base(args.api_base)
        if uuid.UUID(args.upload_id).int == 0:
            raise ValueError("upload ID must be nonzero")
    except ValueError as error:
        parser.error(str(error))
    cookie = getpass.getpass("Authenticated SciEdu Cookie header (not saved): ").strip()
    if not cookie:
        parser.error("a session cookie is required")
    try:
        with Publisher(API(args.api_base, cookie), args.state, args.upload_id, courses) as publisher:
            for course in courses:
                publisher.publish(course)
    except (OSError, ValueError, RuntimeError) as error:
        parser.exit(1, f"Upload stopped: {error}\nResume with the same upload ID and state after resolving the error.\n")

if __name__ == "__main__":
    main()
