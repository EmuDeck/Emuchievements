import {ReactElement} from "react";
import {afterPatch, wrapReactClass, wrapReactType} from "decky-frontend-lib";

export namespace Patching
{
	export let skip = Symbol("DECKY_SKIP");

	export function patch<E extends any>(root: any, defaults: E): RootPatcher<E>
	{
		return new RootPatcher<E>(root, defaults);
	}

	export enum WrapType
	{
		TYPE,
		CLASS
	}

	abstract class Patcher<P extends Patcher<any, any>, E extends any>
	{
		public root: () => RootPatcher<E>;
		public parent: P;
		public object: (ret: any) => any;
		public children: Patcher<any, any>[] = [];
		public handler?: (args: Record<string, unknown>[], ret: ReactElement, vars: E) => { ret: ReactElement | null, vars: E } | symbol;

		protected constructor(root: () => RootPatcher<E>, parent: P, object: (ret: any) => any, handler?: (args: Record<string, unknown>[], ret: ReactElement, vars: E) => { ret: ReactElement | null, vars: E } | symbol)
		{
			this.root = root;
			this.parent = parent;
			this.object = object;
			this.handler = handler;
		}

		abstract patch(env: {ret: ReactElement | null, vars: E}, id: number): void;

		patchChildren(parent: this, ret: { ret: ReactElement | null, vars: E}, id: number)
		{
			let i = id;
			for (let child of parent.children)
			{
				i++;
				console.log(i, child)
				child.patch(ret, i);
			}
		}

		afterPatchBasic(object: (ret: any) => any, property: string, handler?: (args: Record<string, unknown>[], ret: ReactElement, vars: E) => { ret: ReactElement | null, vars: E } | symbol): BasicPatcher<this, E>
		{
			return new BasicPatcher<this, E>(this.root, this, object, property, handler);
		}

		afterPatchWrapping(object: (ret: any) => any, property: string, wrap: WrapType, handler?: (args: Record<string, unknown>[], ret: ReactElement, vars: E) => { ret: ReactElement | null, vars: E } | symbol): WrappingPatcher<this, E>
		{
			return new WrappingPatcher<this, E>(this.root, this, object, property, wrap, handler);
		}

		afterPatchMobX(object: (ret: any) => any, property: string, mobxProp: string = 'type', handler?: (args: Record<string, unknown>[], ret: ReactElement, vars: E) => { ret: ReactElement | null, vars: E } | symbol): MobXPatcher<this, E>
		{
			return new MobXPatcher<this, E>(this.root, this, object, property, mobxProp, handler);
		}

		afterPatchWrappingMobX(object: (ret: any) => any, property: string, mobxProp: string = 'type', wrap: WrapType, handler?: (args: Record<string, unknown>[], ret: ReactElement, vars: E) => { ret: ReactElement | null, vars: E } | symbol): WrappingMobXPatcher<this, E>
		{
			return new WrappingMobXPatcher<this, E>(this.root, this, object, property, mobxProp, wrap, handler);
		}

		done(): P
		{
			console.log('done', this.parent)
			this.parent.children.push(this);
			return this.parent;
		}
	}

	class BasicPatcher<P extends Patcher<any, E>, E extends any> extends Patcher<P, E>
	{
		public property: string;

		constructor(root: () => RootPatcher<E>, parent: P, object: (ret: any) => any, property: string, handler?: (args: any[], ret: any, vars: E) => { ret: ReactElement | null, vars: E } | symbol)
		{
			super(root, parent, object, handler);
			this.property = property;
		}

		patch(env: {ret: ReactElement, vars: E}, id: number): void
		{
			afterPatch(this.object(env.ret), this.property, (args, ret) =>
			{
				console.log('ret', ret)
				if (this.handler)
				{
					let handler = this.handler(args, ret, env.vars);
					console.log('handler', handler);
					if (handler != skip && typeof handler !== "symbol")
					{
						this.patchChildren(this, handler, id);
						return handler;
					}
					return ret;
				}
				else this.patchChildren(this, {ret: ret, vars: env.vars}, id);
				return ret;
			});
		}

	}

	class WrappingPatcher<P extends Patcher<any, E>, E extends any> extends BasicPatcher<P, E>
	{
		public wrap: WrapType

		constructor(root: () => RootPatcher<E>, parent: P, object: (ret: any) => any, property: string, wrap: WrapType, handler?: (args: any[], ret: any, vars: E) => { ret: ReactElement | null, vars: E } | symbol)
		{
			super(root, parent, object, property, handler);
			this.wrap = wrap;
		}

		patch(env: {ret: ReactElement, vars: E}, id: number)
		{
			console.log("Wrapping", env, this.wrap)
			switch (this.wrap)
			{
				case WrapType.CLASS:
					wrapReactClass(this.object(env.ret));
					afterPatch(this.object(env.ret).type.prototype, this.property, (args, ret) =>
					{
						console.log('ret', ret);
						if (this.handler)
						{
							let handler = this.handler(args, ret, env.vars);
							console.log('handler', handler);
							if (handler != skip && typeof handler !== "symbol")
							{
								this.patchChildren(this, handler, id);
								return handler;
							}
							return ret;

						}
						else this.patchChildren(this, {ret: ret, vars: env.vars}, id);
						return ret;
					});
					break;
				case WrapType.TYPE:
					wrapReactType(this.object(env.ret));
					console.log('wrappedType', this.object(env.ret));
					afterPatch(this.object(env.ret).type, this.property, (args, ret) =>
					{
						console.log("ret", ret)
						if (this.handler)
						{
							let handler = this.handler(args, ret, env.vars);
							console.log('handler', handler);
							if (handler != skip && typeof handler !== "symbol")
							{
								this.patchChildren(this, handler, id);
								return handler;
							}
							return ret;

						}
						else this.patchChildren(this, {ret: ret, vars: env.vars}, id);
						return ret;
					});
					break;
			}
		}
	}

	class MobXPatcher<P extends Patcher<any, E>, E extends any> extends BasicPatcher<P, E>
	{
		public mobxProp: string;

		constructor(root: () => RootPatcher<E>, parent: P, object: (ret: any) => any, property: string, mobxProp: string, handler?: (args: any[], ret: any, vars: E) => { ret: ReactElement | null, vars: E } | symbol)
		{
			super(root, parent, object, property, handler);
			this.mobxProp = mobxProp;
		}

		patch(env: {ret: ReactElement, vars: E}, id: number)
		{
			if (this.root().mobXCache.has(id))
			{
				this.object(env.ret)[this.mobxProp] = this.root().mobXCache.get(id)
			} else
			{
				this.root().mobXCache.set(id, this.object(env.ret)[this.mobxProp])
				afterPatch(this.object(env.ret), this.property, (args, ret) =>
				{
					if (this.handler)
					{
						let handler = this.handler(args, ret, env.vars);
						console.log('handler', handler);
						if (handler != skip && typeof handler !== "symbol")
						{
							this.patchChildren(this, handler, id);
							return handler;
						}
						return ret;

					}
					else this.patchChildren(this, {ret: ret, vars: env.vars}, id);
					return ret;
				});
			}
		}
	}

	class WrappingMobXPatcher<P extends Patcher<any, E>, E extends any> extends WrappingPatcher<P, E>
	{
		public mobxProp: string;

		constructor(root: () => RootPatcher<E>, parent: P, object: (ret: any) => any, property: string, mobxProp: string, wrap: WrapType, handler?: (args: any[], ret: any, vars: E) => { ret: ReactElement | null, vars: E } | symbol)
		{
			super(root, parent, object, property, wrap, handler);
			this.mobxProp = mobxProp;
		}

		patch(env: {ret: ReactElement, vars: E}, id: number)
		{
			if (this.root().mobXCache.has(id))
			{
				this.object(env.ret)[this.mobxProp] = this.root().mobXCache.get(id)
			} else
			{
				switch (this.wrap)
				{
					case WrapType.CLASS:
						wrapReactClass(this.object(env.ret));
						this.root().mobXCache.set(id, this.object(env.ret)[this.mobxProp])
						afterPatch(this.object(env.ret).type.prototype, this.property, (args, ret) =>
						{
							if (this.handler)
							{
								let handler = this.handler(args, ret, env.vars);
								console.log('handler', handler);
								if (handler != skip && typeof handler !== "symbol")
								{
									this.patchChildren(this, handler, id);
									return handler;
								}
								return ret;

							}
							else this.patchChildren(this, {ret: ret, vars: env.vars}, id);
							return ret;
						});
						break;
					case WrapType.TYPE:
						wrapReactType(this.object(env.ret));
						this.root().mobXCache.set(id, this.object(env.ret)[this.mobxProp])
						afterPatch(this.object(env.ret).type, this.property, (args, ret) =>
						{
							if (this.handler)
							{
								let handler = this.handler(args, ret, env.vars);
								console.log('handler', handler);
								if (handler != skip && typeof handler !== "symbol")
								{
									this.patchChildren(this, handler, id);
									return handler;
								}
								return ret;

							}
							else this.patchChildren(this, {ret: ret, vars: env.vars}, id);
							return ret;
						});
						break;
				}
			}
		}
	}

	class RootPatcher<E extends any> extends Patcher<any, E>
	{
		public mobXCache: Map<number, any> = new Map<number, any>();
		private defaults: E;

		constructor(root: any, defaults: E)
		{
			super(() => this, null, () => root);
			this.defaults = defaults;
		}

		done(): void
		{
			this.patch({ret: null, vars: this.defaults});
			console.log(this)
		}

		patch(env: {ret: ReactElement | null, vars: E})
		{
			this.patchChildren(this, { ret: this.object(env.ret), vars: env.vars}, 0);
		}
	}
}