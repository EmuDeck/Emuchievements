import { ServerAPI } from 'decky-frontend-lib';
import { useEffect, useState } from 'react';

import { getSetting, setSetting } from '../settings';

export function useSetting<T>(key: string, def: T, serverAPI: ServerAPI): [value: T, setValue: (value: T) => Promise<void>] {
	const [value, setValue] = useState(def);

	useEffect(() => {
		(async () => {
			const res = await getSetting<T>(key, def, serverAPI);
			setValue(res);
		})();
	}, []);

	return [
		value,
		async (val: T) => {
			setValue(val);
			await setSetting(key, val, serverAPI);
		},
	];
}