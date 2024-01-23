import { CSSProperties, FC } from "react";

export type PropsWithStyles<P> = P & {
    style?: CSSProperties
}

export type StyledComponent<P> = FC<PropsWithStyles<P>>

export const wrapStyled = <P extends {}>(WrappedComponent: FC<P>, defaultStyle: CSSProperties = {}): StyledComponent<P> => (props) =>
{
    const {children,  style} = props
    return <WrappedComponent {...props}>
        <div style={{
            ...defaultStyle,
            ...style
        }}>
            {children}
        </div>
    </WrappedComponent>
}