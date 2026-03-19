const sanitizationHandlers = {
    omitted: null,
    lastFour: (v: string) => v.slice(-4),
} satisfies Record<string, ((v: string) => string) | null>;

type SanitizationRule = keyof typeof sanitizationHandlers;

export type SanitizationConfig<T> = {
    [K in keyof T]?: T[K] extends Array<infer U>
        ? U extends object ? [SanitizationConfig<U>] | SanitizationRule : SanitizationRule
        : T[K] extends object
            ? SanitizationConfig<T[K]> | SanitizationRule
            : SanitizationRule;
};

export type Sanitized<T, C extends SanitizationConfig<T>> = {
    [K in keyof T as C[K] extends 'omitted' ? never : K]:
        C[K] extends SanitizationRule
            ? string
            : C[K] extends [infer InnerC]
                ? T[K] extends Array<infer U>
                    ? U extends object
                        ? Array<Sanitized<U, InnerC & SanitizationConfig<U>>>
                        : T[K]
                    : T[K]
                : C[K] extends object
                    ? T[K] extends object
                        ? Sanitized<T[K], C[K] & SanitizationConfig<T[K]>>
                        : T[K]
                    : T[K];
};

export function sanitized<T, C extends SanitizationConfig<T>>(data: T, config: C): Sanitized<T, C> {
    const result: any = {};
    for (const key in data) {
        const rule = config[key];
        if (rule === undefined) {
            result[key] = data[key];
            continue;
        }
        if (typeof rule === 'object') {
            if (Array.isArray(rule)) {
                result[key] = (data[key] as any[]).map(item => sanitized(item, rule[0] as any));
            } else {
                result[key] = sanitized(data[key] as any, rule as any);
            }
            continue;
        }
        const handler = sanitizationHandlers[rule as SanitizationRule];
        if (handler === null) continue;
        result[key] = handler(String(data[key]));
    }
    return result;
}