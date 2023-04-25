import {ServerAPI} from "decky-frontend-lib";
import {EmuchievementsState} from "./hooks/achievementsContext";

export type SettingsData = {
	username: string,
	api_key: string,
	hidden: boolean
}

export class Settings {
	private readonly serverAPI: ServerAPI;
	private readonly state: EmuchievementsState;

	data: SettingsData = {
		username: "",
          api_key: "",
          hidden: false,
	};

	get username(): string {return this.get("username")}
	set username(username: string) {this.set("username", username)}

	get api_key(): string {return this.get("api_key")}
	set api_key(api_key: string) {this.set("api_key", api_key)}

	get hidden(): boolean {return this.get("hidden")}
	set hidden(hidden: boolean) {this.set("hidden", hidden)}


	constructor(serverAPI: ServerAPI, state: EmuchievementsState, startingSettings: SettingsData = {} as SettingsData) {
		this.state = state;
		this.serverAPI = serverAPI;

		this.setMultiple(startingSettings);
	}
	set<T extends keyof SettingsData>(key: T, value: SettingsData[T]) {
		if(this.data.hasOwnProperty(key)) {
			this.data[key] = value;
			this.writeChange(key, value);
		}
		this.state.notifyUpdate()
		return this
	}

	setMultiple(settings: SettingsData) {
		(Object.keys(settings) as (keyof SettingsData)[]).forEach((key: keyof SettingsData) => {
			this.set(key, settings[key]);
		})
		return this
	}

	get<T extends keyof SettingsData>(key: T): SettingsData[T] {
		return this.data[key];
	}

	readSettings(): Promise<Settings> {
		return new Promise<Settings>((resolve, reject) => {
			this.serverAPI.callPluginMethod<any, SettingsData>("get_config", {}).then(result => {
				if(result.success) {
					this.setMultiple(result.result);
					resolve(this);
				} else {
					reject();
				}
			});
		});
	}

	private writeChange(key: keyof SettingsData, value: any) {
		void this.serverAPI.callPluginMethod<any, SettingsData>("set_config_value", {key: key, value: value});
	}
}