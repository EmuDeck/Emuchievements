import hashlib
from pathlib import Path


def Hash(path: str) -> str:
	match Path(path).suffix:
		case '.nes':
			with open(path, "rb") as f:
				file_hash = hashlib.md5()
				if f.read(4) == b"NES\x1A":
					f.seek(0, 0)
					f.seek(16, 0)
				while chunk := f.read(8192):
					file_hash.update(chunk)
			return file_hash.hexdigest()
		case _:
			with open(path, "rb") as f:
				file_hash = hashlib.md5()
				while chunk := f.read(8192):
					file_hash.update(chunk)
			return file_hash.hexdigest()