import {ServerAPI} from "decky-frontend-lib";

export let serverAPI: ServerAPI
export function setServerAPI(api: ServerAPI): void
{
	serverAPI = api;
}

interface GetSettingArgs<T> {
	key: string;
	default: T;
}

interface SetSettingArgs<T> {
	key: string;
	value: T;
}

export async function getSetting<T>(key: string, def: T): Promise<T> {
	const res = (await serverAPI.callPluginMethod('getSetting', {
		key,
		default: def,
	} as GetSettingArgs<T>)) as { result: T };
	return res.result;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
	await serverAPI.callPluginMethod('setSetting', {
		key,
		value,
	} as SetSettingArgs<T>);
}