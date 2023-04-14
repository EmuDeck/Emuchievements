import json
import logging
import os

import decky_plugin

logging.basicConfig(
	filename="/tmp/emuchievements.log",
	format='[Emuchievements] %(asctime)s %(levelname)s %(message)s',
	filemode='w+',
	force=True
)
logger = logging.getLogger()
logger.setLevel(logging.INFO)  # can be changed to logging.DEBUG for debugging issues


class Plugin:

	async def get_config(self):
		with open(os.path.join(decky_plugin.DECKY_PLUGIN_SETTINGS_DIR,"settings.json"), "r") as f:
			return json.load(f)

	async def set_config_value(self, key, value):
		config = json.load(open(os.path.join(decky_plugin.DECKY_PLUGIN_SETTINGS_DIR,"settings.json")))
		config[key] = value
		with open(os.path.join(decky_plugin.DECKY_PLUGIN_SETTINGS_DIR,"settings.json"), "w") as f:
			json.dump(config, f)

		return config

	async def Hash(self, path: str) -> str:
		# lib = ctypes.CDLL(f"{helpers.get_homebrew_path(helpers.get_home_path(helpers.get_user()))}/plugins/{plugin}/bin/Emuchievements.so")
		# hash = lib.hash
		# hash.argtypes = [ctypes.c_char_p]
		# hash.restype = ctypes.c_char_p
		# return hash(path.encode('utf-8'))

		return os.popen(f"'{os.path.join(decky_plugin.DECKY_PLUGIN_DIR, 'bin', 'Emuchievements')}' \"{path}\"").read().strip()

	# Asyncio-compatible long-running code, executed in a task when the plugin is loaded
	async def _main(self):
		if not os.path.exists(os.path.join(decky_plugin.DECKY_PLUGIN_SETTINGS_DIR, "settings.json")):
			with open(os.path.join(decky_plugin.DECKY_PLUGIN_SETTINGS_DIR,"settings.json"), "w") as f:
				json.dump({
					"username": "",
                         "api_key": "",
                         "hidden": False
				}, f)
		pass

	async def _unload(self):
		pass

	async def _migration(self):
		decky_plugin.migrate_settings(
			os.path.join(decky_plugin.DECKY_HOME, "settings", "emuchievements.json"))
		if os.path.exists(os.path.join(decky_plugin.DECKY_PLUGIN_SETTINGS_DIR, "emuchievements.json")):
			os.rename(os.path.join(decky_plugin.DECKY_PLUGIN_SETTINGS_DIR, "emuchievements.json"), os.path.join(decky_plugin.DECKY_PLUGIN_SETTINGS_DIR, "settings.json"))
