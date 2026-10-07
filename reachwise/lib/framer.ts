// Stand-in for the `framer` package so the sections exported from Framer run in plain Next.js.
// Property controls are kept as the documentation of each section's props: `defaultsOf(Section)`
// returns their default values, which is what a Framer canvas instance would have received.

export const ControlType = {
    Boolean: "boolean",
    Number: "number",
    String: "string",
    Color: "color",
    Enum: "enum",
    Font: "font",
    Link: "link",
    Image: "image",
    ResponsiveImage: "responsiveimage",
} as const

// Outside Framer every page is the live "preview" target (never the canvas / export renderers).
export const RenderTarget = {
    canvas: "CANVAS",
    export: "EXPORT",
    thumbnail: "THUMBNAIL",
    preview: "PREVIEW",
    current: (): string => "PREVIEW",
}

export const useIsStaticRenderer = () => false

const registry = new WeakMap<object, Record<string, any>>()

export function addPropertyControls(component: object, controls: Record<string, any>) {
    registry.set(component, controls)
}

export function defaultsOf(component: object): Record<string, any> {
    const controls = registry.get(component) || {}
    const out: Record<string, any> = {}
    for (const [key, c] of Object.entries(controls))
        if (c && c.defaultValue !== undefined) out[key] = c.defaultValue
    return out
}
