// The small property-controls API the sections were originally written against (they began as Framer
// components). Nothing here talks to Framer: each section's addPropertyControls(...) block simply lists
// its props and their defaults, and `defaultsOf(Section)` returns those defaults.

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
