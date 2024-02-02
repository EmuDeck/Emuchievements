import {Mutex} from "async-mutex";
import {ServerAPI} from "decky-frontend-lib";
import {EmuchievementsState} from "./hooks/achievementsContext";
import Logger from "./logger";
import {getTranslateFunc} from "./useTranslations";

export type SettingsData = {
	config_version: string,
	username: string,
	api_key: string,
	cache: CacheData,
	hidden: boolean
};

export type CacheData = {
	ids: Record<number, number | null>;
};

export const CONFIG_VERSION = "1.0.0";

const DEFAULT_CONFIG: SettingsData = {
	config_version: CONFIG_VERSION,
	username: "",
	api_key: "",
	cache: {
		ids: {}
	},
	hidden: false
};

export class Settings
{
	private readonly serverAPI: ServerAPI;
	private readonly state: EmuchievementsState;
	private readonly logger: Logger = new Logger("Settings");
	private readonly mutex: Mutex = new Mutex();
	private readonly packet_size: number = 2048;

	data: SettingsData = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

	get username(): string
	{
		return this.get("username");
	}

	set username(username: string)
	{
		this.set("username", username);
	}

	get api_key(): string
	{
		return this.get("api_key");
	}

	set api_key(api_key: string)
	{
		this.set("api_key", api_key);
	}

	get cache(): CacheData
	{
		return this.get("cache");
	}

	set cache(api_key: CacheData)
	{
		this.set("cache", api_key);
	}

	get hidden(): boolean
	{
		return this.get("hidden");
	}

	set hidden(hidden: boolean)
	{
		this.set("hidden", hidden);
	}


	constructor(serverAPI: ServerAPI, state: EmuchievementsState, startingSettings: SettingsData = {} as SettingsData)
	{
		this.state = state;
		this.serverAPI = serverAPI;

		this.setMultiple(startingSettings);
	}

	set<T extends keyof SettingsData>(key: T, value: SettingsData[T])
	{
		if (this.data.hasOwnProperty(key))
		{
			this.data[key] = value;
			void this.writeSettings();
		}
		this.state.notifyUpdate();
		return this;
	}

	setMultiple(settings: SettingsData)
	{
		(Object.keys(settings) as (keyof SettingsData)[]).forEach((key: keyof SettingsData) =>
		{
			this.set(key, settings[key]);
		});
		return this;
	}

	get<T extends keyof SettingsData>(key: T): SettingsData[T]
	{
		return this.data[key];
	}

	async readSettings(): Promise<void>
	{
		const release = await this.mutex.acquire();
		let buffer = "";
		let length = 0;
		const startResponse = await this.serverAPI.callPluginMethod<{ packet_size?: number; }, number>(
			   "start_read_config",
			   {packet_size: this.packet_size});
		if (startResponse.success)
		{
			length = startResponse.result;
			for (let i = 0; i < length; i++)
			{
				const response = await this.serverAPI.callPluginMethod<{
					index: number;
				}, string>("read_config", {index: i});
				if (response.success)
				{
					buffer += response.result;
				} else
				{
					release();
					throw new Error(response.result);
				}
			}
			release();
			this.logger.debug("readSettings", buffer);
			let data: SettingsData = JSON.parse(buffer);
			if (data.config_version !== CONFIG_VERSION)
			{
				const t = getTranslateFunc();
				this.serverAPI.toaster.toast({
					title: t("title"),
					body: t("settingsReset")
				});
				this.data = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
				await this.writeSettings();
			} else
			{
				this.data = data;
			}
		} else
		{
			release();
			throw new Error(startResponse.result);
		}
	}

	async writeSettings(): Promise<void>
	{
		const release = await this.mutex.acquire();
		const buffer = JSON.stringify(this.data, undefined, "\t");
		const length = Math.ceil(buffer.length / this.packet_size);
		const startResponse = await this.serverAPI.callPluginMethod<{
			length: number,
			packet_size?: number;
		}, void>("start_write_config", {length: length, packet_size: this.packet_size});
		if (startResponse.success)
		{
			for (let i = 0; i < length; i++)
			{
				const data = buffer.slice(i * this.packet_size, (i + 1) * this.packet_size);
				const response = await this.serverAPI.callPluginMethod<{
					index: number,
					data: string;
				}, void>("write_config", {index: i, data: data});
				if (!response.success)
				{
					release();
					throw new Error(response.result);
				}
			}
			release();
		} else
		{
			release();
			throw new Error(startResponse.result);
		}
	}
}