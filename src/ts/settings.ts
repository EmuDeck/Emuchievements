import { Mutex } from "async-mutex";
import { ServerAPI } from "decky-frontend-lib";
import { EmuchievementsState } from "./hooks/achievementsContext";
import Logger from "./logger";

export type SettingsData = {
	retroachievements: RetroAchievementsData,
	cache: CacheData,
	general: GeneralData,
};

export type RetroAchievementsData = {
	username: string,
	api_key: string,
};

export type CacheData = {
	ids: Record<number, number | null>,
};

export type GeneralData = {
	game_page: boolean,
	store_category: boolean,
};

export class Settings
{
	private readonly serverAPI: ServerAPI;
	private readonly state: EmuchievementsState;
	private readonly logger: Logger = new Logger("Settings");
	private readonly mutex: Mutex = new Mutex();
	private readonly packet_size: number = 2048;

	data: SettingsData;

	get retroachievements(): RetroAchievementsData
	{
		return this.get("retroachievements");
	}

	set retroachievements(retroachievements: RetroAchievementsData)
	{
		this.set("retroachievements", retroachievements);
	}

	get general(): GeneralData
	{
		return this.get("general");
	}

	set general(general: GeneralData)
	{
		this.set("general", general);
	}

	get cache(): CacheData
	{
		return this.get("cache");
	}

	set cache(cache: CacheData)
	{
		this.set("cache", cache);
	}


	constructor(serverAPI: ServerAPI, state: EmuchievementsState, startingSettings: SettingsData = {
		retroachievements: {
			username: "",
			api_key: "",
		},
		cache: {
			ids: {},
		},
		general: {
			game_page: true,
			store_category: true,
		},

	})
	{
		this.state = state;
		this.serverAPI = serverAPI;

		this.data = startingSettings;
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
		const startResponse = await this.serverAPI.callPluginMethod<{ packet_size?: number; }, number>("start_read_config", { packet_size: this.packet_size });
		if (startResponse.success)
		{
			length = startResponse.result;
			for (let i = 0; i < length; i++)
			{
				const response = await this.serverAPI.callPluginMethod<{
					index: number;
				}, string>("read_config", { index: i });
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
			const data = JSON.parse(buffer);
			if ('username' in data && 'api_key' in data)
			{
				data.retroachievements = {
					username: data.username,
					api_key: data.api_key,
				}
				delete data.username;
				delete data.api_key;
			}
			if ('hidden' in data) delete data.hidden;
			this.setMultiple(data);
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
		}, void>("start_write_config", { length: length, packet_size: this.packet_size });
		if (startResponse.success)
		{
			for (let i = 0; i < length; i++)
			{
				const data = buffer.slice(i * this.packet_size, (i + 1) * this.packet_size);
				const response = await this.serverAPI.callPluginMethod<{
					index: number,
					data: string;
				}, void>("write_config", { index: i, data: data });
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