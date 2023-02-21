import {ServerAPI} from "decky-frontend-lib";

interface GetSettingArgs<T> {
	key: string;
	default: T;
}

interface SetSettingArgs<T> {
	key: string;
	value: T;
}

export async function getSetting<T>(key: string, def: T, serverAPI: ServerAPI): Promise<T>
{
	const res = (await serverAPI.callPluginMethod('getSetting', {
		key,
		default: def,
	} as GetSettingArgs<T>)) as { result: T };
	return res.result;
}

export async function setSetting<T>(key: string, value: T, serverAPI: ServerAPI): Promise<void> {
	await serverAPI.callPluginMethod('setSetting', {
		key,
		value,
	} as SetSettingArgs<T>);
}