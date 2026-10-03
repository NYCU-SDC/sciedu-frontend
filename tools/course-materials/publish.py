"""Upload the prepared materials as DRAFT courses through the SciEdu API.

Run `python3 tools/course-materials/publish.py --help`. Publishing prompts for
the authenticated session Cookie header without putting it on the command line.
No credentials are written to disk; only returned resource UUIDs are checkpointed.
"""

from __future__ import annotations

import argparse
import getpass
import hashlib
import json
import mimetypes
import os
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urljoin


ROOT = Path(__file__).resolve().parent
STATE_PATH = ROOT / ".data" / "upload-state.json"
MANIFESTS = ("brain-computer-interface.json", "dire-wolf-revival.json")


def digest(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def json_bytes(value: object) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True).encode("utf-8")


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


class API:
    def __init__(self, base: str, cookie: str):
        self.base = base.rstrip("/") + "/"
        self.cookie = cookie

    def request(self, method: str, path: str, body: bytes | None = None, content_type: str | None = None):
        headers = {"Cookie": self.cookie, "Accept": "application/json"}
        if content_type:
            headers["Content-Type"] = content_type
        req = urllib.request.Request(urljoin(self.base, path.lstrip("/")), data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=45) as response:
                data = response.read()
                if "application/json" in response.headers.get("Content-Type", ""):
                    return json.loads(data) if data else None
                return data
        except urllib.error.HTTPError as error:
            detail = error.read(800).decode("utf-8", errors="replace")
            raise RuntimeError(f"{method} {path}: HTTP {error.code}: {detail}") from error

    def get(self, path: str):
        return self.request("GET", path)

    def post(self, path: str, value: dict):
        return self.request("POST", path, json_bytes(value), "application/json")

    def upload(self, file: Path):
        boundary = "sciedu-course-material-upload"
        filename = file.name
        content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        body = (
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"content\"; filename=\"{filename}\"\r\n"
            f"Content-Type: {content_type}\r\n\r\n"
        ).encode() + file.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
        return self.request("POST", "/api/content/media", body, f"multipart/form-data; boundary={boundary}")


class Publisher:
    def __init__(self, api: API, state_path: Path = STATE_PATH):
        self.api = api
        self.state_path = state_path
        self.state = json.loads(state_path.read_text()) if state_path.exists() else {"apiBase": api.base, "items": {}}
        if self.state["apiBase"] != api.base:
            raise ValueError("Checkpoint belongs to a different API base; use a separate state file")

    def save(self):
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.state_path.with_suffix(".tmp")
        temporary.write_text(json.dumps(self.state, indent=2, sort_keys=True) + "\n")
        os.replace(temporary, self.state_path)

    def ensure(self, key: str, fingerprint: str, get_path: str, create):
        item = self.state["items"].get(key)
        if item:
            if item["sha256"] != fingerprint:
                raise ValueError(f"{key} changed after upload; stop and review rather than silently replacing it")
            self.api.get(get_path.format(id=item["id"]))
            return item["id"]
        record = create()
        identifier = record["id"]
        self.state["items"][key] = {"id": identifier, "sha256": fingerprint}
        self.save()
        print(f"created {key}: {identifier}")
        return identifier

    def text(self, key: str, value: str) -> str:
        return self.ensure(key, digest(value.encode()), "/api/content/text/{id}", lambda: self.api.post("/api/content/text", {"content": value}))

    def media(self, key: str, path: Path) -> str:
        return self.ensure(key, digest(path.read_bytes()), "/api/content/media/{id}", lambda: self.api.upload(path))

    def question(self, key: str, question: dict) -> str:
        payload = {"type": question["type"], "content": question["prompt"]}
        return self.ensure(key, digest(json_bytes(payload)), "/api/questions/{id}", lambda: self.api.post("/api/questions", payload))

    def block(self, key: str, page_id: str, block_type: str, resource_id: str, order: int, required: bool):
        payload = {"type": block_type, "resourceId": resource_id, "displayOrder": order, "required": required}
        expected_hash = digest(json_bytes(payload))
        existing_blocks = self.api.get(f"/api/pages/{page_id}/blocks")
        item = self.state["items"].get(key)
        if item:
            if item["sha256"] != expected_hash:
                raise ValueError(f"{key} changed after upload; stop and review")
            if not any(block["id"] == item["id"] and all(block.get(k) == v for k, v in payload.items()) for block in existing_blocks):
                raise ValueError(f"{key} checkpoint does not match the backend page")
            return item["id"]

        # Recover if a prior run created the block but stopped before checkpointing.
        record = next((block for block in existing_blocks if all(block.get(k) == v for k, v in payload.items())), None)
        if record is None:
            record = self.api.post(f"/api/pages/{page_id}/blocks", payload)
        identifier = record["id"]
        self.state["items"][key] = {"id": identifier, "sha256": expected_hash}
        self.save()
        print(f"created {key}: {identifier}")
        return identifier

    def publish(self, course: dict):
        code = course["code"]
        course_payload = {"code": code, "title": course["title"]}
        course_id = self.ensure(
            f"{code}:course", digest(json_bytes(course_payload)), "/api/courses/{id}",
            lambda: self.api.post("/api/courses", course_payload),
        )
        for page_index, page in enumerate(course["pages"]):
            key = f"{code}:{page['code']}"
            page_payload = {"title": page["title"], "displayOrder": page_index}
            page_id = self.ensure(
                f"{key}:page", digest(json_bytes(page_payload)), "/api/pages/{id}",
                lambda: self.api.post(f"/api/courses/{course_id}/pages", page_payload),
            )
            description_id = self.text(f"{key}:description", page["description"])
            self.block(f"{key}:block:description", page_id, "TEXT", description_id, 0, True)

            for image_index, image in enumerate(page["images"]):
                image_id = self.media(f"{key}:image:{image_index}", ROOT / image["file"])
                self.block(f"{key}:block:image:{image_index}", page_id, "MEDIA", image_id, 10 + 10 * image_index, True)

            for question_index, question in enumerate(page["questions"]):
                title_id = self.text(f"{key}:question-title:{question_index}", str(question_index + 1))
                self.block(f"{key}:block:question-title:{question_index}", page_id, "TEXT", title_id, 100 + 10 * question_index, True)
                question_id = self.question(f"{key}:question:{question_index}", question)
                self.block(f"{key}:block:question:{question_index}", page_id, "QUESTION", question_id, 101 + 10 * question_index, True)

            visual_id = self.text(f"{key}:image-description-for-llm", page["imageDescriptionForLLM"])
            self.block(f"{key}:block:image-description-for-llm", page_id, "TEXT", visual_id, 200, False)
        print(f"DRAFT course {code}: {course_id}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-base", help="Backend origin, e.g. http://localhost:8080")
    parser.add_argument("--publish", action="store_true", help="Create DRAFT resources; otherwise print a dry-run plan")
    parser.add_argument("--state", type=Path, default=STATE_PATH, help="Checkpoint path (must stay outside Git)")
    args = parser.parse_args()
    courses = [json.loads((ROOT / name).read_text(encoding="utf-8")) for name in MANIFESTS]
    if not args.publish:
        for course in courses:
            print(json.dumps({"course": course["code"], "pages": plan(course)}, ensure_ascii=False, indent=2))
        return
    if not args.api_base or not args.api_base.startswith(("http://", "https://")):
        parser.error("--publish requires an HTTP(S) --api-base")
    cookie = getpass.getpass("Authenticated SciEdu Cookie header (not saved): ").strip()
    if not cookie:
        parser.error("a session cookie is required")
    publisher = Publisher(API(args.api_base, cookie), args.state)
    for course in courses:
        publisher.publish(course)


if __name__ == "__main__":
    main()
