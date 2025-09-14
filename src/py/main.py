import json
import logging
import math
import os

import decky_plugin

logging.basicConfig(
	filename="/tmp/emuchievements.log",
	format='[Emuchievements] %(asctime)s %(levelname)s %(message)s',
	filemode='w+',
	force=True
)
logger = logging.getLogger()
logger.setLevel(logging.DEBUG)  # can be changed to logging.DEBUG for debugging issues


class Plugin:
	packet_size: int = 1000
	length: int = 0
	buffer: str = ""
	async def start_write_config(self, length, packet_size = 1000) -> None:
		Plugin.buffer = ""
		Plugin.length = length
		Plugin.packet_size = packet_size

	async def write_config(self, index, data) -> None:
		Plugin.buffer += data
		if index >= Plugin.length - 1:
			Plugin.length = 0
			config = json.loads(Plugin.buffer)
			Plugin.buffer = ""
			with open(os.path.join(decky_plugin.DECKY_PLUGIN_SETTINGS_DIR, "settings.json"), "w") as f:
				json.dump(config, f, indent="\t")

	async def start_read_config(self, packet_size = 1000) -> int:
		Plugin.buffer = ""
		Plugin.length = 0
		Plugin.packet_size = packet_size
		with open(os.path.join(decky_plugin.DECKY_PLUGIN_SETTINGS_DIR, "settings.json"), "r") as f:
			config = json.load(f)
			Plugin.buffer = json.dumps(config, indent="\t")
			Plugin.length = math.ceil(len(Plugin.buffer) / float(Plugin.packet_size))
			return Plugin.length

	async def read_config(self, index) -> str:
		if index < Plugin.length - 1:
			return Plugin.buffer[index * Plugin.packet_size : (index + 1) * Plugin.packet_size]
		else:
			Plugin.length = 0
			config =  Plugin.buffer[index * Plugin.packet_size :]
			Plugin.buffer = ""
			return config

	async def hash(self, path: str) -> str:
		# lib = ctypes.CDLL(f"{helpers.get_homebrew_path(helpers.get_home_path(helpers.get_user()))}/plugins/{plugin}/bin/Emuchievements.so")
		# hash = lib.hash
		# hash.argtypes = [ctypes.c_char_p]
		# hash.restype = ctypes.c_char_p
		# return hash(path.encode('utf-8'))

		# return os.popen(
		# 	f"'{os.path.join(decky_plugin.DECKY_PLUGIN_DIR, 'bin', 'hash')}' \"{path}\"").read().strip()

		# Fix PyInstaller Library Issue as Per: https://github.com/xXJSONDeruloXx/Decky-Framegen/
		clean_env = os.environ.copy()
		clean_env["LD_LIBRARY_PATH"] = ""

		cmd = [
			os.path.join(decky_plugin.DECKY_PLUGIN_DIR, "bin", "hash"),
			path
		]
    
		# Run the command and capture its output
		result = subprocess.run(
			cmd,
			env=clean_env,
			capture_output=True,
			text=True,  # This decodes stdout and stderr as strings
			check=True  # This raises an exception if the command fails
		)

		# Return the stripped output
		return result.stdout.strip()

	
	async def reset(self) -> None:
		Plugin.length = 0
		Plugin.buffer = ""
		Plugin.packet_size = 1000

	# Asyncio-compatible long-running code, executed in a task when the plugin is loaded
	async def _main(self):
		if not os.path.exists(os.path.join(decky_plugin.DECKY_PLUGIN_SETTINGS_DIR, "settings.json")):
			with open(os.path.join(decky_plugin.DECKY_PLUGIN_SETTINGS_DIR, "settings.json"), "w") as f:
				json.dump({
					"username": "",
					"api_key": "",
					"cache": {
						"ids": {}
					},
					"hidden": False
				}, f, indent="\t")


	async def _unload(self):
		pass

	async def _migration(self):
		decky_plugin.migrate_settings(
			os.path.join(decky_plugin.DECKY_HOME, "settings", "emuchievements.json"))
		if os.path.exists(os.path.join(decky_plugin.DECKY_PLUGIN_SETTINGS_DIR, "emuchievements.json")):
			os.rename(os.path.join(decky_plugin.DECKY_PLUGIN_SETTINGS_DIR, "emuchievements.json"),
					os.path.join(decky_plugin.DECKY_PLUGIN_SETTINGS_DIR, "settings.json"))
